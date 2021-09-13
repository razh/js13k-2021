import { randFloatSpread } from './math.js';

var audioContext = new AudioContext();
var { sampleRate } = audioContext;

// A4 is 69.
var toFreq = note => 2 ** ((note - 69) / 12) * 440;

var playSound = (buffer, destination = audioContext.destination) => {
  var source = new AudioBufferSourceNode(audioContext, { buffer });
  source.connect(destination);
  source.start();
};

var generateAudioBuffer = (fn, duration, volume) => {
  var length = duration * sampleRate;

  var buffer = new AudioBuffer({ length, sampleRate });
  var channel = buffer.getChannelData(0);
  for (var i = 0; i < length; i++) {
    channel[i] = fn(i / sampleRate, i, channel) * volume;
  }

  return buffer;
};

var generateNotes = (fn, duration, volume) =>
  new Proxy(
    {},
    {
      get(target, property) {
        var sound =
          target[property] ||
          generateAudioBuffer(fn(toFreq(property)), duration, volume);
        target[property] = sound;
        return sound;
      },
    },
  );

// Oscillators
// f: frequency, t: parameter.
var sin = f => t => Math.sin(t * 2 * Math.PI * f);

var saw = f => t => {
  var n = ((t % (1 / f)) * f) % 1;
  return -1 + 2 * n;
};

var tri = f => t => {
  var n = ((t % (1 / f)) * f) % 1;
  return n < 0.5 ? -1 + 2 * (2 * n) : 1 - 2 * (2 * n);
};

var square = f => t => {
  var n = ((t % (1 / f)) * f) % 1;
  return n > 0.5 ? 1 : -1;
};

var decay = d => () => t => Math.exp(-t * d);

// Brown noise.
// https://github.com/Tonejs/Tone.js/blob/dev/Tone/source/Noise.ts
var noise = () => {
  var lastOut = 0;

  return () => {
    var white = randFloatSpread(1);
    var value = (lastOut + 0.02 * white) / 1.02;
    lastOut = value;
    return value * 3.5;
  };
};

// Operators.
var add = (a, b) => f => {
  var af = a(f);
  var bf = b(f);

  return (t, i, a) => af(t, i, a) + bf(t, i, a);
};

var mul = (a, b) => f => {
  var af = a(f);
  var bf = b(f);

  return (t, i, a) => af(t, i, a) * bf(t, i, a);
};

var scale = (fn, n) => f => {
  var fnf = fn(f);
  return (t, i, a) => n * fnf(t, i, a);
};

var slide = (fn, slide) => f => (t, i, a) =>
  fn(f + (i / a.length) * slide)(t, i, a);

var pitchJump = (fn, pitchJump, pitchJumpTime) => f => (t, i, a) =>
  fn(f + (t > pitchJumpTime ? pitchJump : 0))(t, i, a);

var adsr = (attack, decay, sustain, release, sustainVolume) => {
  var length = attack + decay + sustain + release;

  return () => t => {
    if (t < attack) {
      return t / attack;
    }

    if (t < attack + decay) {
      return 1 - ((t - attack) / decay) * (1 - sustainVolume);
    }

    if (t < length - release) {
      return sustainVolume;
    }

    if (t < length) {
      return ((length - t) / release) * sustainVolume;
    }

    return 0;
  };
};

// Reverb
var wet = new GainNode(audioContext, { gain: 0.3 });
var dry = new GainNode(audioContext, { gain: 1 - wet.gain.value });
var convolver = new ConvolverNode(audioContext);
var destination = new GainNode(audioContext);

destination.connect(dry).connect(audioContext.destination);
destination.connect(convolver).connect(wet).connect(audioContext.destination);

// https://github.com/Tonejs/Tone.js/blob/dev/Tone/effect/Reverb.ts
(async () => {
  var decay = 1.5;
  var preDelay = 0.01;
  var duration = decay + preDelay;

  var offlineContext = new OfflineAudioContext(
    1,
    duration * sampleRate,
    sampleRate,
  );

  var gainNode = new GainNode(offlineContext, { gain: 0 });
  gainNode.gain
    .setValueAtTime(1, preDelay)
    .exponentialRampToValueAtTime(0.01, duration);

  var offlineBufferSource = new AudioBufferSourceNode(offlineContext, {
    buffer: generateAudioBuffer(noise(), duration, 1),
  });

  offlineBufferSource.connect(gainNode).connect(offlineContext.destination);
  offlineBufferSource.start();

  convolver.buffer = await offlineContext.startRendering();
})();

var play = sound => playSound(sound, destination);

var shoot = generateNotes(mul(mul(saw, noise), decay(24)), 0.5, 1);
export var playShoot = () => play(shoot[16]);

var jump = generateNotes(
  mul(
    mul(square, pitchJump(square, toFreq(36) - toFreq(31), 0.1)),
    adsr(0.003, 0.05, 0.01, 0.03, 0.5),
  ),
  0.3,
  0.2,
);
export var playJump = () => play(jump[31]);

var enemyDeath = generateNotes(
  mul(
    mul(saw, pitchJump(square, toFreq(27) - toFreq(15), 0.1)),
    adsr(0.001, 0.3, 0.4, 0.3, 0.7),
  ),
  1,
  0.4,
);
export var playEnemyDeath = () => play(enemyDeath[15]);


addEventListener('click', () => audioContext.resume(), { once: true });
