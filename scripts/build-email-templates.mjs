// Copies each .html in supabase/functions/send-email/templates into a .ts string constant, byte for
// byte, because Edge Functions bundle code, not loose files. Run: npm run build:email-templates
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..', 'supabase', 'functions', 'send-email', 'templates');
const templates = [
  ['crewjio-signup-code-supabase', 'signupCodeHtml'],
  ['crewjio-login-code-supabase', 'loginCodeHtml'],
];

for (const [file, name] of templates) {
  const html = readFileSync(join(dir, `${file}.html`), 'utf8');
  writeFileSync(
    join(dir, `${file}.ts`),
    `// Generated from ${file}.html by copying it verbatim. Edit the .html, then rerun: npm run build:email-templates\nexport const ${name} = ${JSON.stringify(html)};\n`,
  );
}
