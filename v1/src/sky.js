// Mars sky: shader dome with sun disc, day/night lighting, fog color, stars and horizon dust.
import * as THREE from "three";
import { DAY, PRESETS } from "./constants.js";
import { clamp, mulberry32 } from "./utils.js";
import { onPresetChanged, getPreset } from "./renderer.js";

const COL_FOG_DAY = new THREE.Color(0xc9855a);
const COL_FOG_DUSK = new THREE.Color(0x7a3a28);
const COL_FOG_NIGHT = new THREE.Color(0x12080a);
const COL_SUN_NOON = new THREE.Color(0xffd9b0);
const COL_SUN_HORIZON = new THREE.Color(0xff6a3c);

const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w;
}
`;

const FRAG = `
varying vec3 vDir;
uniform vec3 uSunDir;
uniform float uDay;
uniform vec3 uSunColor;
void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, -0.1, 1.0);
  vec3 dayHorizon = vec3(0.788, 0.522, 0.353);
  vec3 dayZenith = vec3(0.165, 0.059, 0.051);
  vec3 nightHorizon = vec3(0.070, 0.031, 0.039);
  vec3 nightZenith = vec3(0.012, 0.006, 0.010);
  float grad = smoothstep(0.0, 0.55, h);
  vec3 horizon = mix(nightHorizon, dayHorizon, uDay);
  vec3 zenith = mix(nightZenith, dayZenith, uDay);
  vec3 col = mix(horizon, zenith, grad);
  float d = dot(dir, uSunDir);
  float glow = pow(max(d, 0.0), 24.0) * 0.35 * max(uDay, 0.12);
  float halo = pow(max(d, 0.0), 220.0) * 0.9;
  float disc = smoothstep(0.99955, 0.99985, d) * 2.2;
  col += uSunColor * (glow + halo + disc) * step(-0.06, uSunDir.y);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function initSky(scene, renderer) {
  const uniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uDay: { value: 1 },
    uSunColor: { value: new THREE.Color(0xffd9b0) }
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 28, 16),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    })
  );
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  scene.add(dome);

  const starRng = mulberry32(0x57a125);
  const starPos = new Float32Array(800 * 3);
  for (let i = 0; i < 800; i++) {
    const a = starRng() * Math.PI * 2;
    const e = Math.asin(starRng() * 0.98 + 0.02);
    const r = 1400;
    starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    starPos[i * 3 + 1] = Math.sin(e) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const starGeom = new THREE.BufferGeometry();
  starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffeedd,
    size: 1.7,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false
  });
  const stars = new THREE.Points(starGeom, starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -9;
  scene.add(stars);

  const sunLight = new THREE.DirectionalLight(0xffd9b0, 2.2);
  sunLight.position.set(80, 120, 40);
  sunLight.shadow.camera.left = -45;
  sunLight.shadow.camera.right = 45;
  sunLight.shadow.camera.top = 45;
  sunLight.shadow.camera.bottom = -45;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 420;
  sunLight.shadow.bias = -0.0015;
  scene.add(sunLight);
  scene.add(sunLight.target);

  function applyShadowPreset(name) {
    const p = PRESETS[name];
    sunLight.castShadow = p.shadows && p.shadowSize > 0;
    if (p.shadowSize > 0) {
      sunLight.shadow.mapSize.set(p.shadowSize, p.shadowSize);
      if (sunLight.shadow.map) {
        sunLight.shadow.map.dispose();
        sunLight.shadow.map = null;
      }
    }
  }
  applyShadowPreset(getPreset());
  onPresetChanged(applyShadowPreset);

  const hemi = new THREE.HemisphereLight(0xc98a5a, 0x4a2418, 0.5);
  scene.add(hemi);

  const dustCanvas = document.createElement("canvas");
  dustCanvas.width = 128;
  dustCanvas.height = 64;
  const dctx = dustCanvas.getContext("2d");
  const grad = dctx.createRadialGradient(64, 32, 4, 64, 32, 60);
  grad.addColorStop(0, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  dctx.fillStyle = grad;
  dctx.fillRect(0, 0, 128, 64);
  const dustTex = new THREE.CanvasTexture(dustCanvas);
  const dustGroup = new THREE.Group();
  const dustSprites = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.SpriteMaterial({
      map: dustTex,
      color: 0xc9855a,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      fog: false
    });
    const spr = new THREE.Sprite(mat);
    const ang = (i / 3) * Math.PI * 2;
    spr.position.set(Math.cos(ang) * 330, 26, Math.sin(ang) * 330);
    spr.scale.set(560, 130, 1);
    dustGroup.add(spr);
    dustSprites.push(spr);
  }
  scene.add(dustGroup);

  const sunDirOut = new THREE.Vector3(0, 1, 0);
  const fogColor = new THREE.Color();
  const sunColor = new THREE.Color();
  const anchor = new THREE.Vector3();
  let simTime = DAY.LENGTH_S * 0.18;
  let followObj = null;
  let dayPhase = 0;
  let sunFactor = 1;

  function recompute() {
    dayPhase = ((simTime % DAY.LENGTH_S) + DAY.LENGTH_S) % DAY.LENGTH_S / DAY.LENGTH_S;
    let angle;
    if (dayPhase < DAY.DAY_FRACTION) {
      const dayFrac = dayPhase / DAY.DAY_FRACTION;
      angle = Math.PI * dayFrac;
      sunFactor = Math.max(0, Math.sin(Math.PI * dayFrac));
    } else {
      const nightFrac = (dayPhase - DAY.DAY_FRACTION) / (1 - DAY.DAY_FRACTION);
      angle = Math.PI + Math.PI * nightFrac;
      sunFactor = 0;
    }
    sunDirOut.set(Math.cos(angle), Math.sin(angle) * 0.82 + 0.02, 0.30).normalize();
    uniforms.uSunDir.value.copy(sunDirOut);
    const dayAmount = clamp(sunFactor * 1.6, 0, 1);
    uniforms.uDay.value = dayAmount;
    sunColor.lerpColors(COL_SUN_HORIZON, COL_SUN_NOON, clamp(sunFactor * 1.4, 0, 1));
    uniforms.uSunColor.value.copy(sunColor);
    sunLight.color.copy(sunColor);
    sunLight.intensity = 2.6 * sunFactor + 0.15;
    hemi.intensity = 0.16 + 0.55 * sunFactor;
    starMat.opacity = clamp((0.25 - sunFactor) * 4, 0, 0.9);
    if (sunFactor > 0.3) fogColor.lerpColors(COL_FOG_DUSK, COL_FOG_DAY, clamp((sunFactor - 0.3) / 0.7, 0, 1));
    else fogColor.lerpColors(COL_FOG_NIGHT, COL_FOG_DUSK, clamp(sunFactor / 0.3, 0, 1));
    const sceneRef = dome.parent;
    if (sceneRef && sceneRef.fog) sceneRef.fog.color.copy(fogColor);
    renderer.setClearColor(fogColor, 1);
    for (let i = 0; i < dustSprites.length; i++) {
      dustSprites[i].material.color.copy(fogColor);
      dustSprites[i].material.opacity = 0.06 + 0.1 * sunFactor;
    }
    if (followObj) {
      followObj.getWorldPosition(anchor);
      anchor.x = Math.round(anchor.x / 4) * 4;
      anchor.z = Math.round(anchor.z / 4) * 4;
      anchor.y = 0;
    } else {
      anchor.set(0, 0, 0);
    }
    sunLight.target.position.copy(anchor);
    sunLight.position.set(
      anchor.x + sunDirOut.x * 180,
      anchor.y + Math.max(30, sunDirOut.y * 180),
      anchor.z + sunDirOut.z * 180
    );
    dome.position.set(anchor.x, 0, anchor.z);
    stars.position.set(anchor.x, 0, anchor.z);
    dustGroup.position.set(anchor.x, 0, anchor.z);
  }
  recompute();

  const sky = {
    sunLight,
    setSimTime(t) {
      if (Number.isFinite(t)) simTime = t;
    },
    update(dt) {
      simTime += dt;
      recompute();
    },
    getDayPhase() {
      return dayPhase;
    },
    getSunFactor() {
      return sunFactor;
    },
    getSunDir() {
      return sunDirOut;
    },
    followTarget(obj3d) {
      followObj = obj3d || null;
    }
  };
  return sky;
}
