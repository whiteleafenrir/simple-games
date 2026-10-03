import 'dotenv/config';
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createZstdDecoder, csvRows, puzzleRecord } from './lib/chess-catalog.mjs';

const { values } = parseArgs({
  options: {
    file: { type: 'string', default: 'data/chess/lichess-puzzles.csv' },
    limit: { type: 'string', default: '10000' },
    seed: { type: 'boolean', default: false }
  }
});
const limit = Number(values.limit);
if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const schema = new URL(process.env.DATABASE_URL).searchParams.get('schema') || 'public';
const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL, { schema }) });
const file = createReadStream(resolve(values.file));
const input = values.file.endsWith('.zst') ? file.pipe(createZstdDecoder()) : file;
if (input !== file) file.on('error', (error) => input.destroy(error));
let valid = 0;
let invalid = 0;
let inserted = 0;
let batch = [];
async function flush() {
  if (!batch.length) return;
  if (values.seed) {
    const result = await prisma.chessPuzzle.createMany({ data: batch, skipDuplicates: true });
    inserted += result.count;
  } else {
    await prisma.$transaction(
      batch.map((record) =>
        prisma.chessPuzzle.upsert({
          where: { id: record.id },
          create: record,
          update: record
        })
      )
    );
  }
  batch = [];
}
try {
  for await (const { row } of csvRows(input)) {
    let record;
    try {
      record = puzzleRecord(row);
    } catch {
      invalid++;
      continue;
    }
    batch.push(record);
    valid++;
    if (batch.length === 100) await flush();
    if (valid >= limit) break;
  }
  await flush();
  console.log(
    `[chess] Valid: ${valid}; invalid skipped: ${invalid}; ${values.seed ? `inserted: ${inserted}` : 'upserted: ' + valid}.`
  );
  if (!valid || (values.seed && invalid)) process.exitCode = 1;
} catch (error) {
  console.error(
    `[chess] Import failed (${error.code || error.name}). Completed batches are preserved; rerunning is safe.`
  );
  process.exitCode = 1;
} finally {
  input.destroy();
  file.destroy();
  await prisma.$disconnect();
}
