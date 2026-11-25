// Seeded heightfield terrain with Rapier collider (heights column-major: heights[xIdx*SAMPLES+zIdx]), deposits, rocks, wrecks.
import * as THREE from "three";
import { TERRAIN, DEPOSIT } from "./constants.js";
import { mulberry32, makeNoise2D, fbm, clamp, lerp } from "./utils.js";

const HALF = TERRAIN.SIZE / 2;
const STEP = TERRAIN.SIZE / (TERRAIN.SAMPLES - 1);

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export async function buildTerrain({ seed, scene, rapier, world, assets }) {
  const S = TERRAIN.SAMPLES;
  const noiseA = makeNoise2D(seed >>> 0);
  const noiseB = makeNoise2D((seed ^ 0x9e3779b9) >>> 0);
  const noiseC = makeNoise2D((seed ^ 0x51ab77) >>> 0);
  const heights = new Float32Array(S * S);

  function rawHeight(x, z) {
    const nx = x / 620;
    const nz = z / 620;
    let h = fbm(noiseA, nx, nz, 5, 2.0, 0.5) * 0.62;
    const ridged = 1 - Math.abs(noiseB(x / 260, z / 260));
    h += (ridged * ridged - 0.55) * 0.34;
    h += noiseC(x / 1400 + 3.7, z / 1400 - 1.2) * 0.35;
    h *= TERRAIN.AMPLITUDE;
    const d = Math.hypot(x, z);
    const flat = smoothstep(TERRAIN.HQ_FLAT_RADIUS * 0.5, TERRAIN.HQ_FLAT_RADIUS, d);
    return h * flat;
  }

  for (let zi = 0; zi < S; zi++) {
    for (let xi = 0; xi < S; xi++) {
      heights[zi * S + xi] = rawHeight(xi * STEP - HALF, zi * STEP - HALF);
    }
  }

  function heightAt(x, z) {
    const fx = clamp((x + HALF) / STEP, 0, S - 1.001);
    const fz = clamp((z + HALF) / STEP, 0, S - 1.001);
    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    const tx = fx - x0;
    const tz = fz - z0;
    const h00 = heights[z0 * S + x0];
    const h10 = heights[z0 * S + x0 + 1];
    const h01 = heights[(z0 + 1) * S + x0];
    const h11 = heights[(z0 + 1) * S + x0 + 1];
    return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz);
  }

  const normalOut = new THREE.Vector3();
  function normalAt(x, z) {
    const e = STEP * 0.5;
    const hx = heightAt(x + e, z) - heightAt(x - e, z);
    const hz = heightAt(x, z + e) - heightAt(x, z - e);
    normalOut.set(-hx, 2 * e, -hz).normalize();
    return normalOut;
  }

  const geom = new THREE.BufferGeometry();
  const vertCount = S * S;
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const colors = new Float32Array(vertCount * 3);
  const colorNoise = makeNoise2D((seed ^ 0xc01055) >>> 0);
  for (let zi = 0; zi < S; zi++) {
    for (let xi = 0; xi < S; xi++) {
      const i = zi * S + xi;
      const x = xi * STEP - HALF;
      const z = zi * STEP - HALF;
      positions[i * 3] = x;
      positions[i * 3 + 1] = heights[i];
      positions[i * 3 + 2] = z;
      uvs[i * 2] = xi / (S - 1);
      uvs[i * 2 + 1] = 1 - zi / (S - 1);
      const n = normalAt(x, z);
      const slopeShade = lerp(0.62, 1.0, smoothstep(0.62, 0.96, n.y));
      const varn = 1 + colorNoise(x / 90, z / 90) * 0.09;
      const v = slopeShade * varn;
      colors[i * 3] = v;
      colors[i * 3 + 1] = v * 0.97;
      colors[i * 3 + 2] = v * 0.94;
    }
  }
  const indexCount = (S - 1) * (S - 1) * 6;
  const indices = new Uint32Array(indexCount);
  let ptr = 0;
  for (let zi = 0; zi < S - 1; zi++) {
    for (let xi = 0; xi < S - 1; xi++) {
      const a = zi * S + xi;
      const b = a + 1;
      const c = a + S;
      const d = c + 1;
      indices[ptr++] = a;
      indices[ptr++] = c;
      indices[ptr++] = b;
      indices[ptr++] = b;
      indices[ptr++] = c;
      indices[ptr++] = d;
    }
  }
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geom.setIndex(new THREE.BufferAttribute(indices, 1));
  geom.computeVertexNormals();

  const groundTex = assets.getTexture("mars_ground");
  if (groundTex) groundTex.repeat.set(48, 48);
  const groundNor = assets.getTexture("mars_ground", "normal");
  if (groundNor) groundNor.repeat.set(48, 48);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    normalMap: groundNor || null,
    normalScale: new THREE.Vector2(0.7, 0.7),
    vertexColors: true,
    roughness: 1,
    metalness: 0
  });
  const mesh = new THREE.Mesh(geom, groundMat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  const nsub = S - 1;
  const colHeights = new Float32Array(S * S);
  for (let xi = 0; xi < S; xi++) {
    for (let zi = 0; zi < S; zi++) {
      colHeights[xi * S + zi] = heights[zi * S + xi];
    }
  }
  const groundBody = world.createRigidBody(rapier.RigidBodyDesc.fixed());
  const hfDesc = rapier.ColliderDesc.heightfield(
    nsub, nsub, colHeights, { x: TERRAIN.SIZE, y: 1, z: TERRAIN.SIZE }
  );
  hfDesc.setFriction(1.1);
  world.createCollider(hfDesc, groundBody);

  const rng = mulberry32((seed ^ 0xdeb051) >>> 0);
  const deposits = [];
  const order = ["iron", "nickel", "platinum"];
  let gi = 0;
  for (const type of order) {
    const ring = DEPOSIT.RINGS[type];
    for (let k = 0; k < ring.n; k++) {
      let x = 0, z = 0, ok = false;
      for (let attempt = 0; attempt < 20 && !ok; attempt++) {
        const a = rng() * Math.PI * 2;
        const r = ring.min + rng() * (ring.max - ring.min);
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        ok = true;
        for (let d = 0; d < deposits.length; d++) {
          const dep = deposits[d];
          if (Math.hypot(dep.x - x, dep.z - z) < 60) {
            ok = false;
            break;
          }
        }
      }
      const richness = Math.round(ring.rich[0] + rng() * (ring.rich[1] - ring.rich[0]));
      deposits.push({ id: "d_" + gi, x, z, type, richness });
      gi++;
    }
  }

  const rockTex = assets.getTexture("rock");
  const rockNor = assets.getTexture("rock", "normal");
  const rockMat = new THREE.MeshStandardMaterial({
    map: rockTex,
    normalMap: rockNor || null,
    roughness: 1,
    metalness: 0
  });
  const rockRng = mulberry32((seed ^ 0x40c5) >>> 0);
  const tmpMat = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpScale = new THREE.Vector3();

  const smallGeom = new THREE.IcosahedronGeometry(0.6, 0);
  const smallRocks = new THREE.InstancedMesh(smallGeom, rockMat, TERRAIN.ROCKS_SMALL);
  const rocks = [];
  for (let i = 0; i < TERRAIN.ROCKS_SMALL; i++) {
    const a = rockRng() * Math.PI * 2;
    const r = 55 + rockRng() * 690;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const s = 0.3 + rockRng() * 0.9;
    tmpPos.set(x, heightAt(x, z) - 0.1 * s, z);
    tmpEuler.set(rockRng() * Math.PI, rockRng() * Math.PI * 2, rockRng() * Math.PI);
    tmpQuat.setFromEuler(tmpEuler);
    tmpScale.set(s * (0.7 + rockRng() * 0.6), s * (0.5 + rockRng() * 0.5), s * (0.7 + rockRng() * 0.6));
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    smallRocks.setMatrixAt(i, tmpMat);
    rocks.push({ x, z, scale: s, big: false });
  }
  smallRocks.instanceMatrix.needsUpdate = true;
  smallRocks.castShadow = false;
  smallRocks.receiveShadow = true;
  scene.add(smallRocks);

  const bigGeom = new THREE.IcosahedronGeometry(1, 1);
  const bigRocks = new THREE.InstancedMesh(bigGeom, rockMat, TERRAIN.ROCKS_BIG);
  for (let i = 0; i < TERRAIN.ROCKS_BIG; i++) {
    const a = rockRng() * Math.PI * 2;
    const r = 80 + rockRng() * 640;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const s = 1.5 + rockRng() * 2.5;
    const y = heightAt(x, z) + s * 0.2;
    tmpPos.set(x, y, z);
    tmpEuler.set(rockRng() * 0.6, rockRng() * Math.PI * 2, rockRng() * 0.6);
    tmpQuat.setFromEuler(tmpEuler);
    tmpScale.set(s, s * (0.65 + rockRng() * 0.4), s);
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    bigRocks.setMatrixAt(i, tmpMat);
    rocks.push({ x, z, scale: s, big: true });
    const body = world.createRigidBody(rapier.RigidBodyDesc.fixed().setTranslation(x, y, z));
    const he = s * 0.62;
    world.createCollider(rapier.ColliderDesc.cuboid(he, he * 0.7, he), body);
  }
  bigRocks.instanceMatrix.needsUpdate = true;
  bigRocks.castShadow = true;
  bigRocks.receiveShadow = true;
  scene.add(bigRocks);

  const metalTex = assets.getTexture("metal");
  const metalMat = new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.55, metalness: 0.8 });
  const wreckRng = mulberry32((seed ^ 0x33ec4) >>> 0);
  const wrecks = [];
  const wreckGroup = new THREE.Group();
  for (let i = 0; i < TERRAIN.WRECKS; i++) {
    const a = wreckRng() * Math.PI * 2;
    const r = 150 + wreckRng() * 500;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    const g = new THREE.Group();
    const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 6.5, 8), metalMat);
    bodyMesh.rotation.set(Math.PI / 2 + (wreckRng() - 0.5) * 0.7, wreckRng() * Math.PI * 2, 0);
    bodyMesh.position.y = 1.1;
    g.add(bodyMesh);
    const finCount = 2 + Math.floor(wreckRng() * 3);
    for (let f = 0; f < finCount; f++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, 2.2), metalMat);
      fin.position.set((wreckRng() - 0.5) * 5, 0.5 + wreckRng() * 0.8, (wreckRng() - 0.5) * 5);
      fin.rotation.set(wreckRng() * 0.9, wreckRng() * Math.PI, wreckRng() * 0.9);
      g.add(fin);
    }
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.6), metalMat);
    panel.position.set((wreckRng() - 0.5) * 6, 0.15, (wreckRng() - 0.5) * 6);
    panel.rotation.y = wreckRng() * Math.PI;
    g.add(panel);
    g.position.set(x, y, z);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    wreckGroup.add(g);
    wrecks.push({ x, z, y });
    const body = world.createRigidBody(rapier.RigidBodyDesc.fixed().setTranslation(x, y + 1.1, z));
    world.createCollider(rapier.ColliderDesc.cuboid(3.4, 1.4, 3.4), body);
  }
  scene.add(wreckGroup);

  return {
    mesh,
    heightAt,
    normalAt,
    getDeposits() {
      return deposits;
    },
    getRocks() {
      return rocks;
    },
    getWrecks() {
      return wrecks;
    }
  };
}
