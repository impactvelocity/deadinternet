/**
 * The film's sound as one mixed track, for the rendered video.
 *
 * On the site the voice and the score are two players following the story
 * clock (FlowNarration, FlowMusic). Here the same cues are laid out on movie
 * time and mixed offline: each era's line from where its era starts (cut
 * where the next one begins, as the live player would), the reveal's line
 * from the reveal, the opportunity line through the same robot treatment,
 * and the score under all of it, starting where and at the levels the
 * caller says (the movie starts it under its titles: movieMusicLevel).
 */
import narration from '@/data/flow/narration.json';
import type { FlowEraId } from '@/data/flow/types';
import { MUSIC, musicCues, musicGain } from './music';
import { PLAY_SPEED } from './playback';
import type { Timeline } from './timeline';
import { ROBOT_CUES, robotVoice } from './voice-effects';

export interface VoiceCue {
  src: string;
  /** Seconds into the track the clip starts. */
  at: number;
  /** Seconds of the clip that play. */
  length: number;
  /** Clip-time spans where the voice turns robotic. */
  robot: readonly (readonly [number, number])[];
}

type Clock = Pick<Timeline, 'eraStarts' | 'revealStart'>;

/** Every spoken line, in order, with story position 0 at `offset` seconds. */
export function voiceCues(t: Clock, eras: readonly { id: FlowEraId }[], offset = 0): VoiceCue[] {
  const out: VoiceCue[] = [];
  eras.forEach((era, k) => {
    const chunk = narration.chunks.find((c) => c.era === era.id);
    const start = t.eraStarts[k];
    if (!chunk || start === undefined) return;
    const next = k + 1 < eras.length ? t.eraStarts[k + 1] : t.revealStart;
    out.push({
      src: chunk.src,
      at: offset + start / PLAY_SPEED,
      length: Math.min(chunk.durationSeconds, (next - start) / PLAY_SPEED),
      robot: era.id === 'dead' ? ROBOT_CUES : [],
    });
  });
  out.push({ src: narration.reveal.src, at: offset + t.revealStart / PLAY_SPEED, length: narration.reveal.durationSeconds, robot: [] });
  return out;
}

/** Score gain points per second of the track. */
const GAIN_RATE = 100;

/** A score level law (`level(seconds into the track)`), sampled over the whole track. */
export function musicLevels(level: (seconds: number) => number): Float32Array {
  const n = Math.ceil(MUSIC.durationSeconds * GAIN_RATE) + 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = level(i / GAIN_RATE);
  return out;
}

/** The site's law: the track starts with the story (`musicGain`). */
export function storyMusicLevel(t: Timeline): (seconds: number) => number {
  const cues = musicCues(t);
  return (x) => musicGain(Math.min(t.total, x * PLAY_SPEED), cues);
}

/**
 * Mix the whole track offline: `seconds` long, story position 0 at `offset`,
 * the score starting at `scoreAt` (default: with the story) at
 * `scoreLevel(seconds into the track)` (default: the site's levels).
 * Browser only (OfflineAudioContext, fetch).
 */
export async function renderSoundtrack(
  t: Timeline,
  eras: readonly { id: FlowEraId }[],
  {
    offset,
    seconds,
    scoreAt = offset,
    scoreLevel = storyMusicLevel(t),
    sampleRate = 48000,
  }: { offset: number; seconds: number; scoreAt?: number; scoreLevel?: (seconds: number) => number; sampleRate?: number },
): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const cache = new Map<string, Promise<AudioBuffer>>();
  const load = (src: string) => {
    if (!cache.has(src)) cache.set(src, fetch(src).then((r) => r.arrayBuffer()).then((b) => context.decodeAudioData(b)));
    return cache.get(src)!;
  };

  const score = context.createBufferSource();
  score.buffer = await load(MUSIC.src);
  const level = context.createGain();
  const levels = musicLevels(scoreLevel);
  level.gain.value = levels[0];
  level.gain.setValueCurveAtTime(levels, scoreAt, (levels.length - 1) / GAIN_RATE);
  score.connect(level).connect(context.destination);
  score.start(scoreAt, 0, MUSIC.durationSeconds);

  for (const cue of voiceCues(t, eras, offset)) {
    const clip = context.createBufferSource();
    clip.buffer = await load(cue.src);
    if (cue.robot.length) {
      const robot = robotVoice(context, clip, context.destination);
      for (const [a, b] of cue.robot) {
        if (a >= cue.length) continue;
        robot.set(true, cue.at + a);
        robot.set(false, cue.at + Math.min(b, cue.length));
      }
    } else {
      clip.connect(context.destination);
    }
    clip.start(cue.at, 0, cue.length);
  }
  return context.startRendering();
}

/** 16-bit PCM WAV, scaled down only if the mix would clip. */
export function encodeWav(buffer: AudioBuffer): Uint8Array<ArrayBuffer> {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  let peak = 0;
  for (const data of channels) for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const gain = peak > 0.98 ? 0.98 / peak : 1;
  const frames = buffer.length;
  const bytes = new Uint8Array(44 + frames * channels.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels.length * 2, true);
  view.setUint16(32, channels.length * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, frames * channels.length * 2, true);
  let at = 44;
  for (let i = 0; i < frames; i++) {
    for (const data of channels) {
      const v = Math.max(-1, Math.min(1, data[i] * gain));
      view.setInt16(at, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      at += 2;
    }
  }
  return bytes;
}
