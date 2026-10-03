import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { parseArgs } from 'node:util';
import { createZstdDecoder, csvRows, difficulty, puzzleRecord } from './lib/chess-catalog.mjs';

const { values } = parseArgs({
  options: {
    output: { type: 'string', default: '.local/lichess-puzzles.csv' },
    'per-level': { type: 'string', default: '500' }
  }
});
const quota = Number(values['per-level']);
if (!Number.isSafeInteger(quota) || quota < 1) throw new Error('--per-level must be a positive integer.');
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 300_000);
const response = await fetch('https://database.lichess.org/lichess_db_puzzle.csv.zst', { signal: controller.signal });
if (!response.ok) throw new Error(`Lichess download: HTTP ${response.status}`);
const source = Readable.fromWeb(response.body);
const input = source.pipe(createZstdDecoder());
source.on('error', (error) => input.destroy(error));
const counts = { easy: 0, medium: 0, hard: 0 };
const seen = new Set();
const selected = [];
let examined = 0;
try {
  for await (const { row } of csvRows(input)) {
    examined++;
    if (!row || Number(row.Popularity) < 80 || Number(row.NbPlays) < 100 || Number(row.RatingDeviation) > 100) continue;
    const level = difficulty(Number(row.Rating));
    if (counts[level] >= quota || seen.has(row.PuzzleId)) continue;
    let record;
    try {
      record = puzzleRecord(row);
    } catch {
      continue;
    }
    selected.push(record);
    seen.add(record.id);
    counts[level]++;
    if (Object.values(counts).every((count) => count === quota)) break;
  }
  if (Object.values(counts).some((count) => count !== quota))
    throw new Error('Not enough valid puzzles for every level.');
  selected.sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id));
  const header = 'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags';
  const lines = selected.map((r) =>
    [
      r.id,
      r.fen,
      r.moves.join(' '),
      r.rating,
      r.ratingDeviation,
      r.popularity,
      r.plays,
      r.themes.join(' '),
      r.gameUrl,
      r.openingTags.join(' ')
    ].join(',')
  );
  const path = resolve(values.output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, [header, ...lines, ''].join('\n'));
  console.log(`[chess] Saved ${selected.length} puzzles after examining ${examined} rows: ${JSON.stringify(counts)}`);
} finally {
  clearTimeout(timer);
  source.unpipe(input);
  input.destroy();
  source.destroy();
  controller.abort();
}
