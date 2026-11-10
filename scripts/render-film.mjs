#!/usr/bin/env node
/**
 * Render the film to an MP4, frame by frame, with its soundtrack.
 *
 *   npm run dev            (in another terminal; or point --url at `next start`)
 *   npm run film           → out/film/dead-internet.mp4
 *   npm run film -- --from 0 --to 12 --out out/film/test.mp4   (a quick check)
 *
 * It drives /movie?capture in headless Google Chrome (lib/flow/movie.ts,
 * lib/flow/capture.ts): for every frame it asks the page to draw that exact
 * movie time, with every animation and video held there, and takes a
 * screenshot. Nothing depends on how fast the machine is. Several browsers
 * render consecutive stretches in parallel, each warming up on the second or
 * two before its stretch so cross-fades already in flight carry over. The
 * soundtrack is mixed in the page (lib/flow/soundtrack.ts) with the same
 * cues, levels and robot voice the site plays live.
 *
 * The mix is then brought to a video's loudness (−16 LUFS, `--loudness`)
 * with one static gain and a true-peak limiter, so the balance between the
 * voice, the score and its swell stays exactly as on the site.
 *
 * The video is 1920×1080. Every frame is drawn at twice that and scaled
 * down (`--supersample`), which keeps text and edges steady as the window
 * grows a little each frame.
 *
 * Needs Google Chrome and ffmpeg.
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright-core';

const { values: opt } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:7822/movie' },
    out: { type: 'string', default: 'out/film/dead-internet.mp4' },
    width: { type: 'string', default: '1920' },
    height: { type: 'string', default: '1080' },
    pad: { type: 'string', default: '30' },
    fps: { type: 'string', default: '30' },
    workers: { type: 'string', default: '4' },
    from: { type: 'string' },
    to: { type: 'string' },
    crf: { type: 'string', default: '16' },
    /** Draw every frame this many times larger and scale it down: smooths text and edges as the window grows. */
    supersample: { type: 'string', default: '2' },
    preroll: { type: 'string', default: '2.5' },
    /** Integrated loudness to bring the mix to (LUFS), or `off` for the site's own levels. */
    loudness: { type: 'string', default: '-16' },
    keep: { type: 'boolean', default: false },
    /** Skip rendering: mux the frames and sound a `--keep` run left behind. */
    'mux-only': { type: 'boolean', default: false },
  },
});

const W = Number(opt.width);
const H = Number(opt.height);
const FPS = Number(opt.fps);
const SS = Math.max(1, Number(opt.supersample));
const WORKERS = Math.max(1, Number(opt.workers));
const OUT = path.resolve(opt.out);
const PARTS = `${OUT.replace(/\.mp4$/, '')}.parts`;
const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));

if (W % 2 || H % 2) throw new Error('--width and --height must be even (H.264 4:2:0)');

/** Every image under public/assets, so the page can decode them all up front. */
async function assetImages() {
  const base = path.join(ROOT, 'public');
  const out = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (/\.(jpe?g|png|webp|gif|svg|avif)$/i.test(entry.name)) out.push('/' + path.relative(base, file).split(path.sep).join('/'));
    }
  };
  await walk(path.join(base, 'assets'));
  return out;
}

async function launch() {
  return chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--mute-audio'],
  });
}

/** Open the movie in capture mode and wait until it is ready to draw frames. */
async function openMovie(browser, images) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SS });
  page.on('pageerror', (err) => console.error('[page error]', err.message));
  const url = new URL(opt.url);
  url.searchParams.set('capture', '');
  url.searchParams.set('pad', opt.pad);
  await page.goto(url.toString(), { waitUntil: 'load', timeout: 120_000 });
  // Next's dev-tools badge isn't part of the film.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.waitForFunction(() => window.__film && document.fonts.status === 'loaded', null, { timeout: 120_000 });
  await page.evaluate(async (srcs) => {
    window.__keep = await Promise.all(
      srcs.map((src) => {
        const img = new Image();
        img.src = src;
        return img.decode().then(() => img, () => img);
      }),
    );
  }, images);
  // The feed is measured again once fonts and images settle; let the timeline finish recompiling.
  await page.waitForTimeout(1500);
  const duration = await page.evaluate(() => window.__film.duration);
  const cdp = await page.context().newCDPSession(page);
  return { page, cdp, duration };
}

function ffmpeg(args) {
  const proc = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => {
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  });
  return { proc, done };
}

const progress = { done: 0, total: 0, started: Date.now() };
function report() {
  const secs = (Date.now() - progress.started) / 1000;
  const rate = progress.done / Math.max(secs, 1e-3);
  const eta = rate > 0 ? (progress.total - progress.done) / rate : Infinity;
  process.stdout.write(`\r  frames ${progress.done}/${progress.total}  ${rate.toFixed(1)} fps  eta ${Number.isFinite(eta) ? Math.round(eta) + 's' : '…'}   `);
}

/** Render frames [a, b) into one video segment. */
async function renderStretch(k, a, b, images) {
  const browser = await launch();
  try {
    const { page, cdp } = await openMovie(browser, images);
    const seek = (i) => page.evaluate((t) => window.__film.seek(t), i / FPS);
    // Warm up on the frames just before the stretch (not recorded).
    for (let i = Math.max(0, a - Math.round(Number(opt.preroll) * FPS)); i < a; i++) await seek(i);
    const file = path.join(PARTS, `part-${String(k).padStart(2, '0')}.mp4`);
    const enc = ffmpeg(['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', ...(SS > 1 ? ['-vf', `scale=${W}:${H}:flags=lanczos`] : []), '-c:v', 'libx264', '-preset', 'medium', '-crf', opt.crf, '-pix_fmt', 'yuv420p', '-r', String(FPS), file]);
    for (let i = a; i < b; i++) {
      await seek(i);
      // (An explicit clip with a scale: without it the screenshot comes back at 1× whatever the page is drawn at.)
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H, scale: SS } });
      if (!enc.proc.stdin.write(Buffer.from(data, 'base64'))) await once(enc.proc.stdin, 'drain');
      progress.done++;
    }
    enc.proc.stdin.end();
    await enc.done;
    return file;
  } finally {
    await browser.close();
  }
}

/** Integrated loudness of `file` in LUFS (ffmpeg's EBU R128 meter). */
async function loudnessOf(file) {
  const proc = spawn('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let log = '';
  proc.stderr.on('data', (d) => (log += d));
  await once(proc, 'close');
  const m = [...log.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  if (!m) throw new Error('could not measure the soundtrack’s loudness');
  return Number(m[1]);
}

/** Join the stretches and lay the soundtrack under them. */
async function mux({ first, last }) {
  const list = path.join(PARTS, 'parts.txt');
  const wav = path.join(PARTS, 'soundtrack.wav');
  const filters = [];
  if (opt.loudness !== 'off') {
    const measured = await loudnessOf(wav);
    const gain = Number(opt.loudness) - measured;
    console.log(`Soundtrack ${measured.toFixed(1)} LUFS → ${opt.loudness} LUFS (${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB, peaks limited to −1.5 dBTP)`);
    filters.push(`volume=${gain.toFixed(2)}dB`, 'alimiter=limit=0.841:attack=5:release=60:level=false');
  }
  console.log('Muxing…');
  const enc = ffmpeg([
    '-f', 'concat', '-safe', '0', '-i', list,
    '-ss', String(first / FPS), '-t', String((last - first) / FPS), '-i', wav,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
    ...(filters.length ? ['-af', filters.join(',')] : []),
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', OUT,
  ]);
  enc.proc.stdin.end();
  await enc.done;
}

async function main() {
  await mkdir(PARTS, { recursive: true });
  if (opt['mux-only']) {
    const plan = JSON.parse(await readFile(path.join(PARTS, 'render.json'), 'utf8'));
    await mux(plan);
    console.log(`Done: ${path.relative(process.cwd(), OUT)}`);
    return;
  }
  const images = await assetImages();

  console.log(`Opening ${opt.url} (${W}×${H}${SS > 1 ? `, drawn at ${SS}×` : ''}, ${opt.pad}px padding, ${FPS} fps)…`);
  const probe = await launch();
  let duration;
  const wav = path.join(PARTS, 'soundtrack.wav');
  try {
    const movie = await openMovie(probe, images);
    duration = movie.duration;
    console.log(`Movie is ${duration.toFixed(2)}s. Mixing the soundtrack…`);
    const base64 = await movie.page.evaluate(() => window.__film.soundtrack());
    await writeFile(wav, Buffer.from(base64, 'base64'));
  } finally {
    await probe.close();
  }

  const from = Math.max(0, Number(opt.from ?? 0));
  const to = Math.min(duration, Number(opt.to ?? duration));
  const first = Math.round(from * FPS);
  const last = Math.round(to * FPS);
  progress.total = last - first;
  const per = Math.ceil((last - first) / WORKERS);
  const stretches = [];
  for (let k = 0, a = first; a < last; k++, a += per) stretches.push([k, a, Math.min(last, a + per)]);
  console.log(`Rendering ${progress.total} frames (${from.toFixed(2)}s–${to.toFixed(2)}s) in ${stretches.length} browsers…`);
  const ticker = setInterval(report, 1000);
  let parts;
  try {
    parts = await Promise.all(stretches.map(([k, a, b]) => renderStretch(k, a, b, images)));
  } finally {
    clearInterval(ticker);
    report();
    process.stdout.write('\n');
  }

  await writeFile(path.join(PARTS, 'parts.txt'), parts.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join('\n'));
  await writeFile(path.join(PARTS, 'render.json'), JSON.stringify({ first, last, fps: FPS }));
  await mux({ first, last });
  if (!opt.keep) await rm(PARTS, { recursive: true, force: true });
  console.log(`Done: ${path.relative(process.cwd(), OUT)} (${((Date.now() - progress.started) / 1000).toFixed(0)}s)`);
}

main().catch((err) => {
  console.error('\n' + (err?.stack ?? err));
  process.exit(1);
});
