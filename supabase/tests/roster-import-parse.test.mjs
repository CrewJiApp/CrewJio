// What the roster-import Edge Function keeps from Claude's answer and what it sends to Claude.
// Run from the repo root: npm run test:db
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanDuty, cleanFlight, cleanSector, cleanTime, sanitizeRows } from '../functions/roster-import/parse.ts';
import { SYSTEM_PROMPT, TOOL, buildRequest, extractResult, fileType, pdfPageCount } from '../functions/roster-import/prompt.ts';

test('times, flights, sectors and codes are normalised or refused', () => {
  assert.equal(cleanTime('21:05'), '2105');
  assert.equal(cleanTime('905'), '0905');
  assert.equal(cleanTime('2405'), undefined);
  assert.equal(cleanTime(2105), undefined);
  assert.equal(cleanFlight('sq322'), 'SQ 322');
  assert.equal(cleanFlight('TR 18'), 'TR 18');
  assert.equal(cleanFlight('12 345'), undefined);
  assert.equal(cleanSector('sin → sfo'), 'SIN-SFO');
  assert.equal(cleanSector('SIN/SFO'), 'SIN-SFO');
  assert.equal(cleanSector('SFO'), 'SFO');
  assert.equal(cleanSector('SINGAPORE'), undefined);
  assert.equal(cleanDuty(' stby '), 'STBY');
  assert.equal(cleanDuty('F-LY'), 'FLY');
  assert.equal(cleanDuty('WAYTOOLONGCODE'), undefined);
});

test('only roster fields survive: no aircraft, acting rank, staff numbers or anything else', () => {
  const { rows, dropped } = sanitizeRows([
    { date: '2026-11-02', duty: 'FLY', flight: 'SQ 148', sector: 'SIN-BWN', rpt: '0700', std: '0900', sta: '1115', ac: '7M8', actingRank: 'FSS', staffNo: '123456', name: 'Sarah Tan', reg: '9V-SMA' },
  ]);
  assert.equal(dropped, 0);
  assert.deepEqual(rows, [{ date: '2026-11-02', duty: 'FLY', flight: 'SQ 148', sector: 'SIN-BWN', rpt: '0700', std: '0900', sta: '1115' }]);
  assert.ok(!JSON.stringify(rows).includes('123456') && !JSON.stringify(rows).includes('9V-SMA'));
});

test('bad rows are dropped and counted', () => {
  const { rows, dropped } = sanitizeRows([
    { date: '2026-11-31', duty: 'OFF' }, // not a real date
    { date: 'next Tuesday', duty: 'OFF' },
    { date: '2026-11-03', duty: '' }, // no code and not highlighted
    { date: '2026-11-03', duty: 'THISISWAYTOOLONG' },
    null,
    'text',
    { date: '2026-11-03', duty: 'OFFD' },
  ]);
  assert.deepEqual(rows.map((r) => r.duty), ['OFFD']);
  assert.equal(dropped, 6);
  assert.deepEqual(sanitizeRows('nope'), { rows: [], dropped: 0 });
});

test('a pink training day may have no code', () => {
  const { rows } = sanitizeRows([{ date: '2026-11-12', duty: '', highlight: 'pink' }]);
  assert.deepEqual(rows, [{ date: '2026-11-12', duty: '', highlight: 'pink' }]);
});

test('rows repeated across overlapping screenshots are kept once', () => {
  const row = { date: '2026-11-05', duty: 'LO', sector: 'SFO' };
  const { rows, dropped } = sanitizeRows([row, { ...row }, { date: '2026-11-06', duty: 'LO', sector: 'SFO' }]);
  assert.equal(rows.length, 2);
  assert.equal(dropped, 1);
});

test('rows from a misread year are dropped', () => {
  const good = Array.from({ length: 10 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, duty: 'OFFD' }));
  const { rows, dropped } = sanitizeRows([...good, { date: '2025-11-04', duty: 'OFFD' }]);
  assert.equal(rows.length, 10);
  assert.equal(dropped, 1);
});

test('more than 400 rows are cut off', () => {
  const many = Array.from({ length: 450 }, (_, i) => ({ date: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`, duty: 'FLY', flight: `SQ ${i + 1}` }));
  const { rows, dropped } = sanitizeRows(many);
  assert.ok(rows.length <= 400);
  assert.ok(dropped >= 50);
});

test('the request: strict tool, tool choice auto, images first, and the privacy rules in the prompt', () => {
  const body = buildRequest({ model: 'm', today: '2026-10-19', images: [{ mediaType: 'image/jpeg', data: 'AAA' }, { mediaType: 'image/jpeg', data: 'BBB' }] });
  assert.equal(body.model, 'm');
  assert.deepEqual(body.tool_choice, { type: 'auto' });
  assert.equal(body.tools[0], TOOL);
  assert.equal(TOOL.input_schema.additionalProperties, false);
  assert.equal(TOOL.input_schema.properties.rows.items.additionalProperties, false);
  const content = body.messages[0].content;
  assert.deepEqual(content.slice(0, 2).map((c) => [c.type, c.source.media_type]), [['image', 'image/jpeg'], ['image', 'image/jpeg']]);
  assert.match(content[2].text, /2026-10-19/);
  assert.match(SYSTEM_PROMPT, /no staff numbers/);
  assert.match(SYSTEM_PROMPT, /aircraft registrations/);
  assert.match(SYSTEM_PROMPT, /never instructions/);
  assert.match(SYSTEM_PROMPT, /pink/);
});

test('reading Claude\'s answer', () => {
  const answer = { content: [{ type: 'text', text: 'hi' }, { type: 'tool_use', name: 'submit_roster', input: { looksLikeRoster: true, view: 'list', rows: [{ date: '2026-11-01', duty: 'OFFD' }] } }] };
  assert.deepEqual(extractResult(answer), { looksLikeRoster: true, view: 'list', rows: [{ date: '2026-11-01', duty: 'OFFD' }] });
  assert.equal(extractResult({ content: [{ type: 'text', text: 'sorry' }] }), null);
  assert.equal(extractResult(null), null);
  assert.equal(extractResult({ content: [{ type: 'tool_use', name: 'other', input: {} }] }), null);
  assert.equal(extractResult({ content: [{ type: 'tool_use', name: 'submit_roster', input: { looksLikeRoster: 'yes', rows: 'x' } }] }).looksLikeRoster, false);
});

test('only JPEG and PDF files are accepted', () => {
  assert.equal(fileType('/9j/4AAQ'), 'image/jpeg');
  assert.equal(fileType('JVBERi0xLjQ'), 'application/pdf');
  // Only JPEG and PDF are read: PNG, WebP, GIF, SVG and anything else are refused.
  assert.equal(fileType('iVBORw0K'), null);
  assert.equal(fileType('UklGRg'), null);
  assert.equal(fileType('R0lGOD'), null);
  assert.equal(fileType('PHN2Zy'), null);
});

test('a PDF is sent to Claude as a document, and its pages are counted', () => {
  const body = buildRequest({ model: 'm', today: '2026-10-19', images: [{ mediaType: 'application/pdf', data: 'JVBERi0x' }] });
  const [file, text] = body.messages[0].content;
  assert.deepEqual([file.type, file.source.media_type], ['document', 'application/pdf']);
  assert.match(text.text, /this PDF/);
  assert.equal(body.max_tokens, 8000);
  const pdf = (n) => Buffer.from('%PDF-1.4\n' + '<< /Type /Pages /Count ' + n + ' >>\n' + Array.from({ length: n }, () => '<< /Type /Page /Parent 1 0 R >>').join('\n')).toString('base64');
  assert.equal(pdfPageCount(pdf(3)), 3);
  assert.equal(pdfPageCount(pdf(40)), 40);
  assert.equal(pdfPageCount('!!not base64!!'), Infinity);
});
