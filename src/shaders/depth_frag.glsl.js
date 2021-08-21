export default `
#version 300 es

precision highp float;
precision highp int;

const float PackUpscale = 256. / 255.;

const vec3 PackFactors = vec3(256. * 256. * 256., 256. * 256., 256.);

const float ShiftRight8 = 1. / 256.;

vec4 packDepthToRGBA(const in float v) {
  vec4 r = vec4(fract(v * PackFactors), v);
  r.yzw -= r.xyz * ShiftRight8;
  return r * PackUpscale;
}

in vec2 vHighPrecisionZW;

out vec4 color;

void main() {
  float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
  color = packDepthToRGBA(fragCoordZ);
}
`.trim();
