// In-memory Postgres (PGlite) with every migration applied and a minimal stand-in for what
// Supabase provides: roles, auth.users and auth.uid(). Used by the database tests and by
// shared/ tests that check app-built rows against the real constraints.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS = join(import.meta.dirname, '..', 'migrations');

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  grant usage on schema auth, public to anon, authenticated;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;
`;

export async function createDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }

  /** Run SQL as a signed-in user (or anon when userId is null). Always resets to superuser. */
  async function as(userId, sql, params = []) {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId ?? ''}', false);`);
    await db.exec(`set role ${userId ? 'authenticated' : 'anon'}`);
    try {
      return (await db.query(sql, params)).rows;
    } finally {
      await db.exec('reset role');
    }
  }

  /** Create an auth user and their profile. */
  async function addUser(id, name = 'test', role = 'cabin_crew') {
    await db.query('insert into auth.users (id) values ($1)', [id]);
    await as(id, `insert into public.profiles (id, display_name, role, airline) values ($1, $2, $3, 'SIA')`, [id, name, role]);
  }

  return { db, as, addUser };
}
