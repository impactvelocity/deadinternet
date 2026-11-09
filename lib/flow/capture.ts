/**
 * Frame-exact capture for the rendered film (scripts/render-film.mjs).
 *
 * In capture mode nothing runs on the wall clock. The renderer asks for a
 * movie time, the lab draws that frame, and this clock holds every CSS
 * animation, transition and playing video at the same moment before the
 * frame is taken, however long the screenshot takes.
 *
 * Looping animations (CRT flicker and grain, glows) follow absolute movie
 * time, so frames drawn by separate browsers in parallel line up. One-shot
 * ones (cross-fades, arrivals, transitions) run from the frame they first
 * appeared on. Videos are held paused and seeked to the frame.
 */

type Ms = number;

function once(target: EventTarget, type: string, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      target.removeEventListener(type, done);
      resolve();
    };
    const timer = setTimeout(done, timeout);
    target.addEventListener(type, done, { once: true });
  });
}

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export function installCaptureClock() {
  const born = new WeakMap<Animation, Ms>();
  /** Videos the page asked to play, and the movie time (ms) their clip time 0 falls on. */
  const playing = new Map<HTMLMediaElement, Ms>();
  let now: Ms = 0;

  const proto = HTMLMediaElement.prototype;
  const realPlay = proto.play;
  const realPause = proto.pause;
  proto.play = function (this: HTMLMediaElement) {
    if (!(this instanceof HTMLVideoElement)) return realPlay.call(this);
    this.preload = 'auto';
    if (this.readyState === 0) this.load();
    playing.set(this, now - this.currentTime * 1000);
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  };
  proto.pause = function (this: HTMLMediaElement) {
    if (playing.delete(this)) this.dispatchEvent(new Event('pause'));
    return realPause.call(this);
  };

  /** Hold every animation at movie time `at`; ones not seen before start at `bornAt`. */
  const hold = (at: Ms, bornAt: Ms = at) => {
    for (const a of document.getAnimations()) {
      if (!born.has(a)) {
        born.set(a, bornAt);
        a.pause();
      }
      const end = Number(a.effect?.getComputedTiming().endTime ?? Infinity);
      if (!Number.isFinite(end)) {
        a.currentTime = at;
        continue;
      }
      const time = at - born.get(a)!;
      if (time >= end) {
        // Let it end properly: `finish` fires animationend, and fill: none reverts.
        if (a.playState !== 'finished') a.finish();
        continue;
      }
      if (a.playState !== 'paused') a.pause();
      a.currentTime = Math.max(0, time);
    }
  };

  const seekVideos = (at: Ms) =>
    Promise.all(
      [...playing].map(async ([video, zero]) => {
        if (!video.isConnected) {
          playing.delete(video);
          return;
        }
        if (video.readyState < 1) await once(video, 'loadedmetadata', 5000);
        const length = Number.isFinite(video.duration) ? video.duration : Infinity;
        const time = Math.max(0, (at - zero) / 1000);
        if (time >= length) {
          playing.delete(video);
          video.currentTime = Math.max(0, length - 0.04);
          await once(video, 'seeked', 5000);
          video.dispatchEvent(new Event('ended'));
          return;
        }
        if (Math.abs(video.currentTime - time) < 1e-3 && video.readyState >= 2) return;
        video.currentTime = time;
        await once(video, 'seeked', 5000);
      }),
    );

  const images = () =>
    Promise.all(
      [...document.images]
        .filter((img) => !img.complete)
        .map((img) => Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 5000))])),
    );

  return {
    /**
     * Move to movie time `at` (ms): `draw` puts the frame's DOM in place
     * (synchronously); then animations, videos and images are brought to
     * that moment and the frame is painted.
     */
    async step(at: Ms, draw: () => void) {
      // Anything that started after the last frame was taken started then.
      hold(now);
      now = at;
      draw();
      // Let effects run (videos asked to play, late state).
      await new Promise((r) => setTimeout(r, 0));
      hold(at);
      await Promise.all([seekVideos(at), images(), document.fonts.ready]);
      await frame();
      hold(at);
      await frame();
    },
    uninstall() {
      proto.play = realPlay;
      proto.pause = realPause;
      for (const a of document.getAnimations()) a.play();
    },
  };
}
