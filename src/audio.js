import { randFloatSpread } from './math.js';

var Context =
  window.AudioContext ||
  // eslint-disable-next-line no-undef
  webkitAudioContext;

var audioContext = new Context();
var { sampleRate } = audioContext;

// A4 is 69.
var toFreq = note => 2 ** ((note - 69) / 12) * 440;

var playSound = (sound, destination = audioContext.destination) => {
  var source = audioContext.createBufferSource();
  source.buffer = sound;
  source.connect(destination);
  source.start();
};

var generateAudioBuffer = (fn, duration, volume) => {
  var length = duration * sampleRate;

  var buffer = audioContext.createBuffer(1, length, sampleRate);
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
var wet = audioContext.createGain();
wet.gain.value = 0.3;
wet.connect(audioContext.destination);

var dry = audioContext.createGain();
dry.gain.value = 1 - wet.gain.value;
dry.connect(audioContext.destination);

var convolver = audioContext.createConvolver();
convolver.connect(wet);

var destination = audioContext.createGain();
destination.connect(dry);
destination.connect(convolver);

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

  var gainNode = offlineContext.createGain();
  gainNode.gain.setValueAtTime(0, 0);
  gainNode.gain.setValueAtTime(1, preDelay);
  gainNode.gain.exponentialRampToValueAtTime(0.01, duration);
  gainNode.connect(offlineContext.destination);

  var offlineBufferSource = offlineContext.createBufferSource();
  offlineBufferSource.buffer = generateAudioBuffer(noise(), duration, 1);
  offlineBufferSource.connect(gainNode);
  offlineBufferSource.start();

  convolver.buffer = await offlineContext.startRendering();
})();

addEventListener('click', () => audioContext.resume(), { once: true });
