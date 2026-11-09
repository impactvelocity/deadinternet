#!/usr/bin/env node
/**
 * Measure how loud each narration clip is, every 50 ms, so the ending can
 * turn the voice into light (lib/flow/voice-levels.ts).
 *
 *   npm run voice-levels      → data/flow/voice-levels.json   (needs ffmpeg)
 *
 * Run it again whenever a clip in data/flow/narration.json changes. Each clip
 * becomes one digit per 50 ms, 0 (silence) to 9 (loud speech), on one scale
 * for every clip, so the file stays small and a diff shows what moved.
 */
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const STEP = 0.05;
/** Quieter than this is silence (dB RMS); this loud or louder is full. */
const FLOOR_DB = -48;
const TOP_DB = -18;

const narration = JSON.parse(await readFile(path.join(ROOT, 'data/flow/narration.json'), 'utf8'));
const srcs = [...new Set([...narration.chunks.map((c) => c.src), narration.reveal.src])];

function levels(src) {
  const file = path.join(ROOT, 'public', src);
  const rate = 16000;
  const filter = [
    'aformat=channel_layouts=mono',
    `aresample=${rate}`,
    `asetnsamples=n=${Math.round(rate * STEP)}:p=0`,
    'astats=metadata=1:reset=1',
    'ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-',
  ].join(',');
  const run = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-af', filter, '-f', 'null', '-'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`ffmpeg failed on ${src}: ${run.stderr}`);
  return run.stdout
    .split('\n')
    .filter((line) => line.includes('RMS_level='))
    .map((line) => {
      const db = Number(line.split('=').pop());
      const x = Number.isFinite(db) ? (db - FLOOR_DB) / (TOP_DB - FLOOR_DB) : 0;
      return Math.round(Math.min(1, Math.max(0, x)) * 9);
    })
    .join('');
}

const clips = Object.fromEntries(srcs.map((src) => [src, levels(src)]));
const out = { stepSeconds: STEP, floorDb: FLOOR_DB, topDb: TOP_DB, clips };
await writeFile(path.join(ROOT, 'data/flow/voice-levels.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`data/flow/voice-levels.json: ${srcs.length} clips`);
