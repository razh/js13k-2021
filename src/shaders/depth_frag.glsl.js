export default `
#version 300 es

precision highp float;
precision highp int;

vec4 packDepthToRGBA(float v) {
  vec4 r = vec4(
    fract(
      v *
      // PackFactors
      vec3(256 * 256 * 256, 256 * 256, 256)
    ),
    v
  );
  r.yzw -=
    r.xyz *
    // ShiftRight8
    1. / 256.;
  return
    r *
    // PackUpscale
    256. / 255.;
}

in vec2 vHighPrecisionZW;

out vec4 color;

void main() {
  color = packDepthToRGBA(
    // fragCoordZ
    .5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + .5
  );
}
`.trim();
