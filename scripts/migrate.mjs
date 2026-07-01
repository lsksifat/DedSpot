// Applies db/schema.sql to the database.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSql, ROOT } from './lib.mjs';

const sql = getSql();

try {
  const schema = readFileSync(resolve(ROOT, 'db', 'schema.sql'), 'utf8');
  await sql.unsafe(schema); // trusted, local schema file (not user input)
  console.log('✅ Schema applied.');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
