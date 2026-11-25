// WebGL renderer, scene, camera, graphics presets, adaptive downgrade and optional bloom.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { PRESETS } from "./constants.js";

const PRESET_ORDER = ["LOW", "MEDIUM", "HIGH"];
const LS_KEY = "ml_preset";

let renderer = null;
let scene = null;
let camera = null;
let composer = null;
let bloomPass = null;
let canvasEl = null;
let vignetteEl = null;
let currentPreset = "MEDIUM";
const presetCbs = new Set();
let adaptiveTimer = null;

function gpuString(gl) {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (ext) return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
    return String(gl.getParameter(gl.RENDERER) || "");
  } catch (err) {
    return "";
  }
}

export function autoDetectPreset() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved && PRESETS[saved]) return saved;
  } catch (err) {}
  let gpu = "";
  if (renderer) gpu = gpuString(renderer.getContext());
  else {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (gl) gpu = gpuString(gl);
  }
  return /Intel|UHD|HD Graphics|Iris/i.test(gpu) ? "LOW" : "MEDIUM";
}

export function initRenderer(canvas) {
  canvasEl = canvas;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xc9855a, 30, 750);
  camera = new THREE.PerspectiveCamera(62, canvas.clientWidth / Math.max(1, canvas.clientHeight), 0.3, 2600);
  camera.position.set(0, 24, 42);
  vignetteEl = document.getElementById("vignette");
  if (!vignetteEl) {
    vignetteEl = document.createElement("div");
    vignetteEl.id = "vignette";
    document.body.appendChild(vignetteEl);
  }
  currentPreset = autoDetectPreset();
  applyPreset(currentPreset);
  window.addEventListener("resize", handleResize);
  return { renderer, scene, camera };
}

export function applyPreset(name) {
  if (!PRESETS[name] || !renderer) return;
  currentPreset = name;
  const p = PRESETS[name];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatio));
  renderer.shadowMap.enabled = p.shadows;
  renderer.shadowMap.type = name === "HIGH" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.shadowMap.needsUpdate = true;
  if (scene.fog) scene.fog.far = p.fogFar;
  if (vignetteEl) vignetteEl.style.display = p.vignette ? "block" : "none";
  if (p.bloom) {
    if (!composer) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(canvasEl.clientWidth, canvasEl.clientHeight),
        0.35, 0.6, 0.85
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }
  }
  try {
    localStorage.setItem(LS_KEY, name);
  } catch (err) {}
  handleResize();
  for (const cb of Array.from(presetCbs)) {
    try {
      cb(name, p);
    } catch (err) {
      console.warn("preset callback error", err);
    }
  }
}

export function getPreset() {
  return currentPreset;
}

export function onPresetChanged(cb) {
  presetCbs.add(cb);
  return () => presetCbs.delete(cb);
}

export function startAdaptive(getFrameMs) {
  if (adaptiveTimer) clearInterval(adaptiveTimer);
  const startedAt = performance.now();
  adaptiveTimer = setInterval(() => {
    if (performance.now() - startedAt > 30000) {
      clearInterval(adaptiveTimer);
      adaptiveTimer = null;
      return;
    }
    const ms = getFrameMs();
    if (ms > 15) {
      const idx = PRESET_ORDER.indexOf(currentPreset);
      if (idx > 0) {
        const next = PRESET_ORDER[idx - 1];
        applyPreset(next);
        globalThis.game?.toast?.("Graphics lowered to " + next + " for smooth framerate", "info");
      } else {
        clearInterval(adaptiveTimer);
        adaptiveTimer = null;
      }
    }
  }, 3000);
}

export function handleResize() {
  if (!renderer || !canvasEl) return;
  const w = canvasEl.clientWidth || window.innerWidth;
  const h = canvasEl.clientHeight || window.innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  if (composer) composer.setSize(w, h);
}

export function renderFrame() {
  if (!renderer) return;
  if (composer && PRESETS[currentPreset].bloom) composer.render();
  else renderer.render(scene, camera);
}
