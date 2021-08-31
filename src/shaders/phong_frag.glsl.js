export default `
#version 300 es

precision highp float;
precision highp int;

#define PI 3.141592653589793
#define RECIPROCAL_PI 0.31830988618
#define saturate(a) clamp(a, 0.0, 1.0)

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;

struct IncidentLight {
  vec3 color;
  vec3 direction;
};

struct ReflectedLight {
  vec3 directDiffuse;
  vec3 directSpecular;
  vec3 indirectDiffuse;
  vec3 indirectSpecular;
};

struct GeometricContext {
  vec3 position;
  vec3 normal;
  vec3 viewDir;
};

const float UnpackDownscale = 255. / 256.;

const vec3 PackFactors = vec3(256. * 256. * 256., 256. * 256., 256.);

const vec4 UnpackFactors = UnpackDownscale / vec4(PackFactors, 1.);

float unpackRGBAToDepth(const in vec4 v) {
  return dot(v, UnpackFactors);
}

in vec3 vColor;

uniform bool fog;
uniform vec3 fogColor;
in vec3 vFogPosition;
uniform float fogNear;
uniform float fogFar;

vec3 BRDF_Lambert(const in vec3 diffuseColor) {
  return RECIPROCAL_PI * diffuseColor;
}

vec3 F_Schlick(const in vec3 f0, const in float f90, const in float dotVH) {
  float fresnel = exp2((-5.55473 * dotVH - 6.98316) * dotVH);
  return f0 * (1.0 - fresnel) + (f90 * fresnel);
}

float G_BlinnPhong_Implicit() {
  return 0.25;
}

float D_BlinnPhong(const in float shininess, const in float dotNH) {
  return RECIPROCAL_PI * (shininess * 0.5 + 1.0) * pow(dotNH, shininess);
}

vec3 BRDF_BlinnPhong(const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float shininess) {
  vec3 halfDir = normalize(incidentLight.direction + geometry.viewDir);
  float dotNH = saturate(dot(geometry.normal, halfDir));
  float dotVH = saturate(dot(geometry.viewDir, halfDir));
  vec3 F = F_Schlick(specularColor, 1.0, dotVH);
  float G = G_BlinnPhong_Implicit();
  float D = D_BlinnPhong(shininess, dotNH);
  return F * (G * D);
}

uniform bool receiveShadow;
uniform vec3 ambient;

vec3 getAmbientLightIrradiance(const in vec3 ambientLightColor) {
  vec3 irradiance = ambientLightColor;
  irradiance *= PI;
  return irradiance;
}

struct DirectionalLight {
  vec3 direction;
  vec3 color;
};

uniform DirectionalLight directionalLight;

void getDirectionalLightInfo(const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight light) {
  light.color = directionalLight.color;
  light.direction = directionalLight.direction;
}

in vec3 vViewPosition;

struct BlinnPhongMaterial {
  vec3 diffuseColor;
  vec3 specularColor;
  float specularShininess;
};

void RE_Direct_BlinnPhong(const in IncidentLight directLight, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight) {
  float dotNL = saturate(dot(geometry.normal, directLight.direction));
  vec3 irradiance = dotNL * directLight.color;
  irradiance *= PI;
  reflectedLight.directDiffuse += irradiance * BRDF_Lambert(material.diffuseColor);
  reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong(directLight, geometry, material.specularColor, material.specularShininess);
}

void RE_IndirectDiffuse_BlinnPhong(const in vec3 irradiance, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight) {
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert(material.diffuseColor);
}

uniform sampler2D directionalShadowMap;
in vec4 vDirectionalShadowCoord;

float texture2DCompare(sampler2D depths, vec2 uv, float compare) {
  return step(compare, unpackRGBAToDepth(texture(depths, uv)));
}

float getShadow(sampler2D shadowMap, vec4 shadowCoord) {
  float shadow = 1.0;
  shadowCoord.xyz /= shadowCoord.w;
  bvec4 inFrustumVec = bvec4(shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0);
  bool inFrustum = all(inFrustumVec);
  bvec2 frustumTestVec = bvec2(inFrustum, shadowCoord.z <= 1.0);
  bool frustumTest = all(frustumTestVec);
  if (frustumTest) {
    shadow = texture2DCompare(shadowMap, shadowCoord.xy, shadowCoord.z);
  }
  return shadow;
}

out vec4 color;

void main() {
  vec3 diffuseColor = diffuse;
  ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));

  diffuseColor *= vColor;

  vec3 fdx = dFdx(vViewPosition);
  vec3 fdy = dFdy(vViewPosition);
  vec3 normal = normalize(cross(fdx, fdy));

  BlinnPhongMaterial material;
  material.diffuseColor = diffuseColor;
  material.specularColor = specular;
  material.specularShininess = shininess;

  GeometricContext geometry;
  geometry.position = -vViewPosition;
  geometry.normal = normal;
  geometry.viewDir = normalize(vViewPosition);

  IncidentLight directLight;

  getDirectionalLightInfo(directionalLight, geometry, directLight);

  directLight.color *= receiveShadow ? getShadow(directionalShadowMap, vDirectionalShadowCoord) : 1.0;

  RE_Direct_BlinnPhong(directLight, geometry, material, reflectedLight);

  vec3 irradiance = getAmbientLightIrradiance(ambient);
  RE_IndirectDiffuse_BlinnPhong(irradiance, geometry, material, reflectedLight);

  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + emissive;

  float fogDepth = length(vFogPosition);
  float fogFactor = fog ? smoothstep(fogNear, fogFar, fogDepth) : 0.0;
  color = vec4(mix(outgoingLight, fogColor, fogFactor), 1.0);
}
`.trim();
