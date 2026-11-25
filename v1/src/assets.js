// Asset manifest loader with cached texture/audio lookup and procedural canvas fallbacks.
import * as THREE from "three";
import { mulberry32 } from "./utils.js";

const TEX_ALIAS = { mars_ground: "mars_soil", solar: "panel" };
const AUDIO_ALIAS = {
  engine: "engine_loop",
  wind: "wind_loop",
  drill: "drill_loop",
  charge: "charge_loop",
  ui_buy: "ui_open",
  plug: "deploy"
};

const texCache = new Map();
const loader = new THREE.TextureLoader();
let warnedManifest = false;

function normalizeUrl(p) {
  if (typeof p !== "string" || !p) return null;
  if (p.startsWith("http") || p.startsWith("./") || p.startsWith("../")) return p;
  return "./" + p;
}

function fillNoise(ctx, size, rng, colors, cell) {
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
      ctx.globalAlpha = 0.25 + rng() * 0.5;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.globalAlpha = 1;
}

function makeProceduralCanvas(kind) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const rng = mulberry32(0xa55e75 ^ kind.length * 977);
  if (kind === "rock") {
    ctx.fillStyle = "#6e6259";
    ctx.fillRect(0, 0, size, size);
    fillNoise(ctx, size, rng, ["#7d7168", "#5c524a", "#89796b", "#4e453f"], 8);
    fillNoise(ctx, size, rng, ["#84766c", "#57493f"], 32);
  } else if (kind === "metal") {
    ctx.fillStyle = "#8f8d8a";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 3) {
      ctx.fillStyle = rng() > 0.5 ? "#9a9895" : "#84827f";
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, y, size, 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#5c5a58";
    for (let i = 0; i < 48; i++) {
      const x = 24 + Math.floor(rng() * 14) * 34;
      const y = 24 + Math.floor(rng() * 14) * 34;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "solar" || kind === "panel") {
    ctx.fillStyle = "#101a33";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#2a3f6e";
    ctx.lineWidth = 4;
    const step = size / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }
    fillNoise(ctx, size, rng, ["#16234a", "#0d1529"], 16);
  } else {
    ctx.fillStyle = "#8a3d24";
    ctx.fillRect(0, 0, size, size);
    fillNoise(ctx, size, rng, ["#b06034", "#6b2a18", "#9a4a28", "#7c3520"], 6);
    fillNoise(ctx, size, rng, ["#a55530", "#5f2515"], 24);
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rng() > 0.5 ? "#c07a4a" : "#4f1e10";
      ctx.fillRect(rng() * size, rng() * size, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  return c;
}

function configureTexture(tex, isColor) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export async function loadAssets() {
  let manifest = { audio: {}, textures: {}, models: {} };
  try {
    const res = await fetch("./assets/manifest.json");
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object") {
        manifest = {
          audio: data.audio && typeof data.audio === "object" ? data.audio : {},
          textures: data.textures && typeof data.textures === "object" ? data.textures : {},
          models: data.models && typeof data.models === "object" ? data.models : {}
        };
      }
    } else if (!warnedManifest) {
      warnedManifest = true;
      console.warn("assets: manifest.json fetch failed (" + res.status + "), using procedural fallbacks");
    }
  } catch (err) {
    if (!warnedManifest) {
      warnedManifest = true;
      console.warn("assets: manifest.json unavailable, using procedural fallbacks", err);
    }
  }

  const assets = {
    manifest,
    getTexture(key, channel = "albedo") {
      const k = TEX_ALIAS[key] || key;
      const cacheKey = k + ":" + channel;
      if (texCache.has(cacheKey)) return texCache.get(cacheKey);
      const entry = manifest.textures[k];
      let url = null;
      if (entry && typeof entry === "object") url = normalizeUrl(entry[channel]);
      else if (typeof entry === "string" && channel === "albedo") url = normalizeUrl(entry);
      let tex = null;
      if (url) {
        tex = loader.load(url, undefined, undefined, () => {
          console.warn("assets: texture failed to load: " + url);
        });
        configureTexture(tex, channel === "albedo");
      } else if (channel === "albedo") {
        tex = new THREE.CanvasTexture(makeProceduralCanvas(key));
        configureTexture(tex, true);
      }
      texCache.set(cacheKey, tex);
      return tex;
    },
    getAudioUrl(key) {
      const k = AUDIO_ALIAS[key] || key;
      const url = manifest.audio[k] ?? manifest.audio[key];
      return normalizeUrl(url);
    },
    getModelUrl(key) {
      return normalizeUrl(manifest.models[key]);
    }
  };
  return assets;
}
