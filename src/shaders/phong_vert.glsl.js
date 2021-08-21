export default `
#version 300 es

precision highp float;
precision highp int;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
in vec3 position;
out vec3 vViewPosition;

in vec3 color;
out vec3 vColor;

out vec3 vFogPosition;

uniform mat4 directionalShadowMatrix;
out vec4 vDirectionalShadowCoord;

// struct DirectionalLightShadow {
//   float shadowBias;
//   float shadowNormalBias;
//   float shadowRadius;
//   vec2 shadowMapSize;
// };

// uniform DirectionalLightShadow directionalLightShadow;

void main() {
  vColor.xyz = color.xyz;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1);

  gl_Position = projectionMatrix * mvPosition;
  vViewPosition = -mvPosition.xyz;

  // vec3 transformedNormal = normalMatrix * normal;
  vec4 worldPosition = modelMatrix * vec4(position, 1);
  // vec3 shadowWorldNormal = inverseTransformDirection(transformedNormal, viewMatrix);
  // vec4 shadowWorldPosition = worldPosition + vec4(shadowWorldNormal * directionalLightShadows[0].shadowNormalBias, 0);
  // vDirectionalShadowCoord = directionalShadowMatrix[0] * shadowWorldPosition;
  vDirectionalShadowCoord = directionalShadowMatrix * worldPosition;

  vFogPosition = mvPosition.xyz;
}
`.trim();
