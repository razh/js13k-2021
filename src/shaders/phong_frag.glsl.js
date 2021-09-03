export default `
#version 300 es

precision highp float;
precision highp int;

#define saturate(a) clamp(a, 0., 1.)

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;

in vec3 vColor;

uniform bool fog;
uniform vec3 fogColor;
in vec3 vFogPosition;
uniform float fogNear;
uniform float fogFar;

uniform bool receiveShadow;
uniform vec3 ambient;

struct DirectionalLight {
  vec3 direction;
  vec3 color;
};

uniform DirectionalLight directionalLight;

in vec3 vViewPosition;

uniform sampler2D directionalShadowMap;
in vec4 vDirectionalShadowCoord;

out vec4 color;

void main() {
  vec3 diffuseColor = diffuse * vColor;

  vec3 normal = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
  vec3 viewDir = normalize(vViewPosition);

  vec4 shadowCoord = vDirectionalShadowCoord;
  shadowCoord.xyz /= shadowCoord.w;
  vec3 irradiance =
    // dotNL
    saturate(dot(normal, directionalLight.direction)) *
    directionalLight.color *
    // getShadow
    (receiveShadow &&
    all(
      bvec2(
        all(
          bvec4(
            shadowCoord.x >= 0.,
            shadowCoord.x <= 1.,
            shadowCoord.y >= 0.,
            shadowCoord.y <= 1.
          )
        ),
        shadowCoord.z <= 1.
      )
    )
      ? // texture2DCompare
        step(
          shadowCoord.z,
          // unpackRGBAToDepth
          dot(
            texture(directionalShadowMap, shadowCoord.xy),
            // UnpackFactors
            // UnpackDownscale
            255. / 256. /
            // PackFactors
            vec4(256 * 256 * 256, 256 * 256, 256, 1.)
          )
        )
      : 1.);
  vec3 halfDir = normalize(directionalLight.direction + viewDir);
  float dotVH = saturate(dot(viewDir, halfDir));
  float fresnel = exp2((-5.55473 * dotVH - 6.98316) * dotVH);

  color = vec4(
    mix(
      // outgoingLight
      // directDiffuse
      irradiance * diffuseColor +
      // indirectDiffuse
      ambient * diffuseColor +
      // directSpecular
      irradiance *
        // F_Schlick
        (specular * (1. - fresnel) + fresnel) *
        // G_BlinnPhong_Implicit
        .25 *
        // D_BlinnPhong
        (shininess * .5 + 1.) *
        pow(
          // dotNH
          saturate(dot(normal, halfDir)),
          shininess
       ) +
      emissive,
      fogColor,
      // fogFactor
      fog
        ? smoothstep(
            fogNear,
            fogFar,
            // fogDepth
            length(vFogPosition)
          )
        : 0.
    ),
    1
  );
}
`.trim();
