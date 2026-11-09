// The line stays human, but the machine shows through on the words that hurt:
// a flicker on "selling it" and "anyone", a fault across "said yes", and
// "having friends again" goes fully robotic.
// Clip-time cues (ashley-dead-sad.mp3) make pause, seek and speed changes replay the same treatment.
const ROBOT_CUES = [
  [3.44, 3.56], [4.16, 4.6],
  [6.19, 6.32],
  [9.24, 9.98],
  [11.06, 12.32],
] as const;

export function opportunityRobotAt(seconds: number): boolean {
  return ROBOT_CUES.some(([start, end]) => seconds >= start && seconds < end);
}

/** Live opportunity-voice processing. The original recording stays untouched. */
export function createVoiceEffects(player: HTMLAudioElement) {
  if (typeof AudioContext === 'undefined') return null;
  const context = new AudioContext();
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
  filter.connect(robot).connect(gate).connect(wet).connect(context.destination);
  dry.connect(context.destination);
  const source = context.createMediaElementSource(player);
  source.connect(dry);
  source.connect(filter);
  dry.gain.value = 1;
  wet.gain.value = 0;
  carrier.start();
  flutter.start();

  let robotEnabled = false;
  return {
    setRobot(enabled: boolean) {
      if (enabled === robotEnabled) return;
      robotEnabled = enabled;
      const now = context.currentTime;
      dry.gain.setTargetAtTime(enabled ? 0.35 : 1, now, 0.015);
      wet.gain.setTargetAtTime(enabled ? 0.85 : 0, now, 0.015);
    },
    resume: () => context.resume(),
    dispose() {
      carrier.stop();
      flutter.stop();
      source.disconnect();
      void context.close();
    },
  };
}
