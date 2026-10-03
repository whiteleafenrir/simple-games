import { Chess } from 'chess.js';
import { StringDecoder } from 'node:string_decoder';
import { Transform } from 'node:stream';
import { Decompress } from 'fzstd';

// Node 26.1's native decoder stops at the first skippable frame in the Lichess archive.
export function createZstdDecoder() {
  let decoder;
  const stream = new Transform({
    transform(chunk, _encoding, callback) {
      try {
        decoder.push(chunk);
        callback();
      } catch (error) {
        callback(error);
      }
    },
    flush(callback) {
      try {
        decoder.push(new Uint8Array(), true);
        callback();
      } catch (error) {
        callback(error);
      }
    }
  });
  decoder = new Decompress((chunk) => stream.push(chunk));
  return stream;
}

// Lichess uses one CSV record per line; fields may be quoted and contain commas.
export function csvFields(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else field += char;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  fields.push(field);
  return fields;
}

function integer(value, min, max = 2_147_483_647) {
  if (!/^-?\d+$/.test(value)) throw new Error('Invalid integer');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error('Integer out of range');
  return number;
}

export function puzzleRecord(row) {
  if (!/^[a-zA-Z0-9]{5}$/.test(row.PuzzleId ?? '')) throw new Error('Invalid puzzle id');
  const moves = row.Moves.trim().split(/\s+/);
  if (moves.length < 2 || moves.length % 2 !== 0 || moves.some((move) => !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))) {
    throw new Error('Invalid UCI solution');
  }
  const chess = new Chess(row.FEN);
  const fen = chess.fen();
  for (const move of moves) {
    if (chess.isGameOver()) throw new Error('Solution continues after game over');
    chess.move(move);
  }
  if (chess.isDraw()) throw new Error('Solution ends in a draw');
  if (!/^https:\/\/lichess\.org\/[a-zA-Z0-9]{8}(?:\/(?:white|black))?(?:#\d+)?$/.test(row.GameUrl ?? '')) {
    throw new Error('Invalid game URL');
  }
  return {
    id: row.PuzzleId,
    fen,
    moves,
    rating: integer(row.Rating, 0),
    ratingDeviation: integer(row.RatingDeviation, 0),
    popularity: integer(row.Popularity, -100, 100),
    plays: integer(row.NbPlays, 0),
    themes: row.Themes.trim().split(/\s+/).filter(Boolean),
    gameUrl: row.GameUrl,
    openingTags: (row.OpeningTags ?? '').trim().split(/\s+/).filter(Boolean)
  };
}

export async function* csvRows(stream) {
  const decoder = new StringDecoder('utf8');
  let pending = '';
  let headers;
  function parseLine(raw) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) return null;
    if (!headers) {
      headers = csvFields(line.replace(/^\uFEFF/, ''));
      for (const field of [
        'PuzzleId',
        'FEN',
        'Moves',
        'Rating',
        'RatingDeviation',
        'Popularity',
        'NbPlays',
        'Themes',
        'GameUrl'
      ]) {
        if (!headers.includes(field)) throw new Error(`Missing CSV column: ${field}`);
      }
      return null;
    }
    try {
      const values = csvFields(line);
      if (values.length !== headers.length) throw new Error('Wrong CSV field count');
      return { row: Object.fromEntries(headers.map((key, index) => [key, values[index]])), line };
    } catch {
      return { row: null, line };
    }
  }
  // Iterating the source itself propagates file/decompression errors, including early EOF.
  for await (const chunk of stream) {
    pending += decoder.write(chunk);
    let end;
    while ((end = pending.indexOf('\n')) !== -1) {
      const row = parseLine(pending.slice(0, end));
      pending = pending.slice(end + 1);
      if (row) yield row;
    }
  }
  const last = parseLine(pending + decoder.end());
  if (last) yield last;
  if (!headers) throw new Error('Empty CSV');
}

export function difficulty(rating) {
  return rating < 1200 ? 'easy' : rating < 1800 ? 'medium' : 'hard';
}
