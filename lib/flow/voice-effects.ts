// The line stays human, but the machine shows through on the words that hurt:
// a flicker on "selling it" and "anyone", a fault across "said yes", and
// "having friends again" goes fully robotic.
// Clip-time cues (ashley-dead-sad.mp3) make pause, seek and speed changes replay the same treatment.
export const ROBOT_CUES = [
  [3.44, 3.56], [4.16, 4.6],
  [6.19, 6.32],
  [9.24, 9.98],
  [11.06, 12.32],
] as const;

export function opportunityRobotAt(seconds: number): boolean {
  return ROBOT_CUES.some(([start, end]) => seconds >= start && seconds < end);
}

/**
 * The robot treatment on any audio context: `input` reaches `output` dry, and
 * through a band-passed, ring-modulated, fluttering wet path that `set`
 * blends in. Used live (createVoiceEffects) and for the rendered film's
 * soundtrack (lib/flow/soundtrack.ts), so both sound the same.
 */
export function robotVoice(context: BaseAudioContext, input: AudioNode, output: AudioNode) {
  const dry = context.createGain();
  const wet = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1700;
  filter.Q.value = 0.55;

  // Audio-rate amplitude modulation adds the metallic robot harmonics.
  const carrier = context.createOscillator();
  carrier.frequency.value = 47;
  const depth = context.createGain();
  depth.gain.value = 0.65;
  const robot = context.createGain();
  robot.gain.value = 0.35;
  carrier.connect(depth).connect(robot.gain);

  // A quiet, fast square-wave layer gives the voice a digital flutter.
  const flutter = context.createOscillator();
  flutter.type = 'square';
  flutter.frequency.value = 13;
  const flutterDepth = context.createGain();
  flutterDepth.gain.value = 0.1;
  const gate = context.createGain();
  gate.gain.value = 0.9;
  flutter.connect(flutterDepth).connect(gate.gain);
  filter.connect(robot).connect(gate).connect(wet).connect(output);
  dry.connect(output);
  input.connect(dry);
  input.connect(filter);
  dry.gain.value = 1;
  wet.gain.value = 0;
  carrier.start();
  flutter.start();

  return {
    /** Blend the robot in (or back out) from context time `at`. */
    set(enabled: boolean, at: number) {
      dry.gain.setTargetAtTime(enabled ? 0.35 : 1, at, 0.015);
      wet.gain.setTargetAtTime(enabled ? 0.85 : 0, at, 0.015);
    },
    stop() {
      carrier.stop();
      flutter.stop();
    },
  };
}

/** Live opportunity-voice processing. The original recording stays untouched. */
export function createVoiceEffects(player: HTMLAudioElement) {
  if (typeof AudioContext === 'undefined') return null;
  const context = new AudioContext();
  const source = context.createMediaElementSource(player);
  const robot = robotVoice(context, source, context.destination);

  let robotEnabled = false;
  return {
    setRobot(enabled: boolean) {
      if (enabled === robotEnabled) return;
      robotEnabled = enabled;
      robot.set(enabled, context.currentTime);
    },
    resume: () => context.resume(),
    dispose() {
      robot.stop();
      source.disconnect();
      void context.close();
    },
  };
}
