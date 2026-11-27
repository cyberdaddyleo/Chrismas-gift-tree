// 四个场景：雪原（带雪地荧光） / 林间小屋 / 雪夜小镇 / 壁炉客厅
import * as THREE from 'three';
import { rng, canvasTex, glowSprite, mergeColored } from './util.js';
import { makeSky, makeStars, makeMoon, makeSnow, makeGlints, makeFire, makeSmoke, makeShootingStar, makeSnowGlow } from './fx.js';

export const SCENES = [
  { id: 'snowfield', name: '雪原', swatch: ['#071630', '#7cf5dc'] },
  { id: 'cabin', name: '林间小屋', swatch: ['#0b1d33', '#ffb35c'] },
  { id: 'town', name: '雪夜小镇', swatch: ['#13244a', '#ff9a52'] },
  { id: 'fireplace', name: '壁炉客厅', swatch: ['#3a2418', '#ff7a2e'] },
];

const QN = { high: 1, medium: 0.65, low: 0.4 };
const WARM = new THREE.Color('#ffb661');

// ---------- 地形 ----------
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const duneHeight = (x, z) => {
  const r = Math.hypot(x, z);
  const amp = smooth(9, 42, r);
  return amp * (Math.sin(x * 0.11) * Math.cos(z * 0.09) * 1.5 + Math.sin(x * 0.23 + z * 0.17) * 0.5 + Math.sin(x * 0.05 - z * 0.07) * 2.4 + 1.2);
};
const flat = () => 0;

function makeGround(heightFn, color = '#d3dfee') {
  const geo = new THREE.PlaneGeometry(360, 360, 150, 150);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightFn(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }));
  return m;
}

function makeMound(color) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(7, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(1.25), roughness: 0.9 }));
  m.scale.set(1, 0.05, 1);
  return m;
}

function makeHills(color, seed = 2) {
  const g = new THREE.Group();
  const r = rng(seed);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), mat);
    const x = -220 + i * 55 + (r() - 0.5) * 30, z = -160 - r() * 90;
    m.scale.set(45 + r() * 40, 14 + r() * 22, 30 + r() * 20);
    m.position.set(x, -4, z);
    g.add(m);
  }
  return g;
}

// 雪山山脉：一条带状高度场，山顶覆雪，远处被雾吃掉
function makeRidge({ z, x = 0, width = 460, depth = 70, h = 40, seed = 1, snowLine = 0.5, base = '#16223d', rock = '#2b3d63', snow = '#c7d4ea' }) {
  const geo = new THREE.PlaneGeometry(width, depth, 200, 20);
  geo.rotateX(-Math.PI / 2);
  const r = rng(seed);
  const ph = Array.from({ length: 6 }, (_, k) => [r() * 6.28, 0.008 + r() * 0.02 * (1 + k * 0.4), 1 / (1 + k * 0.7)]);
  const sum = ph.reduce((a, [, , w]) => a + w, 0);
  const prof = (xx) => { let v = 0; for (const [p0, f, w] of ph) v += (1 - Math.abs(Math.sin(xx * f + p0))) * w; return v / sum; };
  const pos = geo.attributes.position, col = [];
  const cb = new THREE.Color(base), cr = new THREE.Color(rock), cs = new THREE.Color(snow), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const xx = pos.getX(i), zz = pos.getZ(i);
    const v = (zz + depth / 2) / depth;
    const ridge = Math.pow(Math.sin(Math.PI * v), 1.4);
    const y = h * Math.pow(prof(xx), 2.2) * ridge * (0.9 + 0.1 * Math.sin(xx * 0.21 + zz * 0.33));
    pos.setY(i, y - 2);
  }
  // 按高度上色：山脚深蓝，往上岩石，山顶积雪
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + 2) / h;
    const sn = Math.min(1, Math.max(0, (t - snowLine) / 0.12));
    c.copy(cb).lerp(cr, Math.min(1, t / snowLine)).lerp(cs, sn);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  m.position.set(x, 0, z);
  return m;
}

// ---------- 低多边形松树（实例化） ----------
let _pineGeo;
function pineGeometry() {
  if (_pineGeo) return _pineGeo;
  const parts = [{ geo: new THREE.CylinderGeometry(0.16, 0.24, 1.1, 6), color: '#3e2a1e', matrix: new THREE.Matrix4().makeTranslation(0, 0.55, 0) }];
  const tiers = [[1.45, 1.9, 1.45], [1.12, 1.6, 2.45], [0.8, 1.35, 3.3], [0.5, 1.05, 4.05]];
  tiers.forEach(([r, h, y], i) => {
    parts.push({ geo: new THREE.ConeGeometry(r, h, 8, 1), color: i % 2 ? '#123a30' : '#0e3128', matrix: new THREE.Matrix4().makeTranslation(0, y, 0) });
    const cap = new THREE.Matrix4().makeRotationY(Math.PI / 8).premultiply(new THREE.Matrix4().makeTranslation(0, y + h * 0.27, 0));
    parts.push({ geo: new THREE.ConeGeometry(r * 0.64, h * 0.5, 8, 1), color: '#b9c9e2', matrix: cap });
  });
  _pineGeo = mergeColored(parts);
  _pineGeo.userData.keep = true;
  return _pineGeo;
}
function makePines(list, heightFn) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  const im = new THREE.InstancedMesh(pineGeometry(), mat, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  list.forEach(([x, z, sc, rot], i) => {
    p.set(x, heightFn(x, z) - 0.1, z); q.setFromAxisAngle(up, rot); s.set(sc, sc * (0.9 + (i % 5) * 0.06), sc);
    im.setMatrixAt(i, m4.compose(p, q, s));
  });
  return im;
}
function scatterPines(n, seed, rMin, rMax, avoid) {
  const r = rng(seed), out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 30) {
    const a = r() * Math.PI * 2, d = rMin + Math.sqrt(r()) * (rMax - rMin);
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
    if (avoid && avoid(x, z)) continue;
    out.push([x, z, 0.9 + r() * 1.6, r() * 6.28]);
  }
  return out;
}
const frontCorridor = (x, z) => (z > -9 && Math.abs(x) < 15) || Math.hypot(x, z) < 9;

// ---------- 房子 ----------
let _plank;
function plankTexture() {
  if (_plank) return _plank;
  _plank = canvasTex(256, 256, (g, w) => {
    const r = rng(5);
    for (let i = 0; i < 8; i++) {
      const v = 190 + Math.floor(r() * 50);
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, i * 32, w, 32);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, i * 32 + 30, w, 2);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(Math.floor(r() * w), i * 32, 2, 32);
    }
  });
  _plank.wrapS = _plank.wrapT = THREE.RepeatWrapping;
  _plank.repeat.set(2, 2);
  _plank.userData.keep = true;
  return _plank;
}

const snowMat = () => new THREE.MeshStandardMaterial({ color: '#eef4fc', roughness: 0.9 });
function windowMesh(w, h, glow = 1.7) {
  const g = new THREE.Group();
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: WARM.clone().multiplyScalar(glow) }));
  g.add(pane);
  const fm = new THREE.MeshStandardMaterial({ color: '#2b1b12', roughness: 0.8 });
  const t = 0.12;
  for (const [x, y, ww, hh] of [[0, h / 2, w + t, t], [0, -h / 2, w + t, t], [-w / 2, 0, t, h], [w / 2, 0, t, h], [0, 0, t * 0.6, h], [0, 0, w, t * 0.6]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 0.1), fm); b.position.set(x, y, 0.04); g.add(b);
  }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.12, 0.3), snowMat()); sill.position.set(0, -h / 2 - 0.08, 0.12); g.add(sill);
  const gl = glowSprite('#ffb466', Math.max(w, h) * 2.6, 0.32); gl.position.z = 0.5; g.add(gl);
  return g;
}

function stringLights(points, palette, count) {
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffffff' }), count);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  const curve = new THREE.CatmullRomCurve3(points);
  for (let i = 0; i < count; i++) {
    const p = curve.getPoint(i / (count - 1));
    p.y -= Math.abs(Math.sin((i / (count - 1)) * Math.PI * (points.length - 1))) * 0.12;
    im.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
    im.setColorAt(i, c.set(palette[i % palette.length]).multiplyScalar(2.2));
  }
  im.userData.palette = palette;
  im.userData.twinkle = (t) => {
    for (let i = 0; i < count; i++) {
      const on = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.7);
      im.setColorAt(i, c.set(palette[i % palette.length]).multiplyScalar(0.6 + on * 1.8));
    }
    im.instanceColor.needsUpdate = true;
  };
  return im;
}

function makeHouse({ w = 6, h = 3.6, d = 5, roof = 2.6, wall = '#8c5a3c', roofColor = '#3a2a26', lights = null, chimney = true }) {
  const g = new THREE.Group();
  const tw = [];
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: wall, map: plankTexture(), roughness: 0.85 }));
  body.position.y = h / 2; g.add(body);
  const half = w / 2 + 0.35;
  const tri = new THREE.Shape(); tri.moveTo(-half, 0); tri.lineTo(half, 0); tri.lineTo(0, roof); tri.closePath();
  const rg = new THREE.ExtrudeGeometry(tri, { depth: d + 0.7, bevelEnabled: false }); rg.translate(0, 0, -(d + 0.7) / 2);
  const roofM = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.8 })); roofM.position.y = h; g.add(roofM);
  const L = Math.hypot(half, roof), ang = Math.atan2(roof, half);
  for (const s of [-1, 1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.26, d + 0.85), snowMat());
    slab.position.set((s * half) / 2, h + roof / 2 + 0.13, 0); slab.rotation.z = -s * ang; g.add(slab);
  }
  const fz = d / 2 + 0.02;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.12), new THREE.MeshStandardMaterial({ color: '#4a2c1c', roughness: 0.7 }));
  door.position.set(0, 1.0, fz + 0.03); g.add(door);
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 6, 16), new THREE.MeshStandardMaterial({ color: '#1e5a3a' }));
  wreath.position.set(0, 1.45, fz + 0.12); g.add(wreath);
  const wx = Math.min(w * 0.3, 2.1);
  for (const x of [-wx, wx]) { const wm = windowMesh(1.1, 1.2); wm.position.set(x, h * 0.55, fz); g.add(wm); }
  const gw = windowMesh(0.7, 0.7, 2); gw.position.set(0, h + roof * 0.33, d / 2 + 0.37); g.add(gw);
  const sw = windowMesh(1.0, 1.1); sw.position.set(w / 2 + 0.02, h * 0.55, 0); sw.rotation.y = Math.PI / 2; g.add(sw);
  if (chimney) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), new THREE.MeshStandardMaterial({ color: '#6b4a3a', roughness: 0.9 }));
    ch.position.set(w * 0.22, h + roof * 0.55, -d * 0.15); g.add(ch);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.85), snowMat()); cap.position.set(w * 0.22, h + roof * 0.55 + 1.15, -d * 0.15); g.add(cap);
    g.userData.chimneyTop = new THREE.Vector3(w * 0.22, h + roof * 0.55 + 1.2, -d * 0.15);
  }
  if (lights) {
    const z = (d + 0.7) / 2 + 0.06;
    const sl = stringLights([new THREE.Vector3(-half, h - 0.02, z), new THREE.Vector3(-half / 2, h + roof / 2, z), new THREE.Vector3(0, h + roof + 0.05, z), new THREE.Vector3(half / 2, h + roof / 2, z), new THREE.Vector3(half, h - 0.02, z)], lights, 34);
    g.add(sl); tw.push(sl);
  }
  g.userData.twinklers = tw;
  return g;
}

function makeLamp() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#1d2026', roughness: 0.6, metalness: 0.4 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 3.4, 8), dark); post.position.y = 1.7; g.add(post);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.42), dark); head.position.y = 3.55; g.add(head);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), new THREE.MeshBasicMaterial({ color: WARM.clone().multiplyScalar(2.4) })); bulb.position.y = 3.55; g.add(bulb);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 4), snowMat()); cap.position.y = 3.98; cap.rotation.y = Math.PI / 4; g.add(cap);
  const gl = glowSprite('#ffb466', 3.2, 0.7); gl.position.y = 3.55; g.add(gl);
  return g;
}

// ---------- 公共装配 ----------
function outdoorBase(ctx, cfg) {
  const group = new THREE.Group();
  const updaters = [];
  const sky = makeSky(cfg.sky); group.add(sky);
  const stars = makeStars(Math.round(1600 * QN[ctx.quality]), cfg.seed || 3); group.add(stars); updaters.push(stars.userData.update);
  if (cfg.moon) group.add(makeMoon(...cfg.moon));
  if (cfg.shooting) { const ss = makeShootingStar(); group.add(ss); updaters.push(ss.userData.update); }
  const ground = makeGround(cfg.height || duneHeight, cfg.groundColor); group.add(ground);
  group.add(makeMound(cfg.groundColor || '#26385f'));
  const glints = makeGlints(Math.round(2200 * QN[ctx.quality]), cfg.height || duneHeight, 55); group.add(glints); updaters.push(glints.userData.update);
  group.add(new THREE.HemisphereLight(cfg.hemi[0], cfg.hemi[1], cfg.hemi[2]));
  const dl = new THREE.DirectionalLight(cfg.dir[0], cfg.dir[1]); dl.position.set(...cfg.dir[2]); group.add(dl);
  return { group, updaters };
}

// ---------- 场景 ----------
const builders = {
  snowfield(ctx) {
    const { group, updaters } = outdoorBase(ctx, {
      sky: { top: '#01030a', mid: '#07163a', horizon: '#1d3862', glow: '#6f9cd8', glowStrength: 0.28, band: '#7096d8', bandStrength: 0.65 },
      moon: [86, 60, -290, 58, '#f8f4e6'], shooting: true, groundColor: '#24345c', seed: 9,
      hemi: ['#5674b0', '#0a1020', 0.8], dir: ['#cfe0ff', 1.3, [40, 60, -60]],
    });
    group.add(makeRidge({ z: -118, h: 56, seed: 3, snowLine: 0.34, snow: '#dfe8f7' }));
    group.add(makeRidge({ z: -72, h: 24, seed: 8, width: 380, snowLine: 0.42, base: '#101a31', rock: '#22345a', snow: '#c9d6ec' }));
    group.add(makePines(scatterPines(Math.round(70 * QN[ctx.quality] + 30), 51, 16, 90, frontCorridor), duneHeight));
    // 雪地荧光 + 慢慢往上飘的萤火
    const glow = makeSnowGlow(Math.round(80 * QN[ctx.quality] + 24), duneHeight); group.add(glow); updaters.push(glow.userData.update);
    const fair = makeSnow(Math.round(200 * QN[ctx.quality]), { color: '#8ff7e0', fall: -0.06, size: 3.2, area: [50, 12, 40] });
    group.add(fair); updaters.push(fair.userData.update);
    return { group, update: (t) => updaters.forEach((u) => u(t)), fog: ['#091733', 0.0095], snow: 0.9, exposure: 1.02 };
  },

  cabin(ctx) {
    const { group, updaters } = outdoorBase(ctx, {
      sky: { top: '#02060f', mid: '#091a30', horizon: '#223c5e', glow: '#ffb070', glowStrength: 0.1, band: '#5f80bb', bandStrength: 0.5 },
      moon: [120, 100, -300, 28], groundColor: '#263659', seed: 5,
      hemi: ['#5a76aa', '#0e1422', 0.75], dir: ['#b8ccff', 1.0, [30, 50, -20]],
    });
    const house = makeHouse({ w: 8, h: 4.2, d: 6, roof: 3.2, wall: '#9a6440', roofColor: '#2f2420', lights: ['#ff4d5a', '#ffd36b', '#5cc8ff', '#7cf0c8', '#ffffff'] });
    house.position.set(-13, 0, -11); house.rotation.y = 0.5; group.add(house);
    const smoke = makeSmoke(); smoke.position.copy(house.userData.chimneyTop).applyMatrix4(house.matrixWorld.compose(house.position, house.quaternion, house.scale));
    group.add(smoke); updaters.push(smoke.userData.update);
    const pl = new THREE.PointLight('#ffae5c', 40, 26, 1.6); pl.position.set(-10, 2.6, -6.5); group.add(pl);
    // 小屋到树的灯笼小路
    [[-9.2, -4.6], [-7.4, -1.6], [-6.2, 1.6], [-5.6, 4.8]].forEach(([x, z]) => {
      const l = makeLamp(); l.position.set(x, duneHeight(x, z), z); l.scale.setScalar(0.62); group.add(l);
    });
    // 木栅栏
    const fence = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: '#5a3a26', roughness: 0.9 });
    for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), wood); p.position.set(i * 1.5, 0.65, 0); fence.add(p); const c = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.26), snowMat()); c.position.set(i * 1.5, 1.33, 0); fence.add(c); }
    for (const y of [0.45, 0.95]) { const r = new THREE.Mesh(new THREE.BoxGeometry(12, 0.12, 0.08), wood); r.position.set(6, y, 0.05); fence.add(r); }
    fence.position.set(9, 0, -9); fence.rotation.y = -0.35; group.add(fence);
    group.add(makePines(scatterPines(46, 31, 18, 80, (x, z) => frontCorridor(x, z) || Math.hypot(x + 13, z + 11) < 8), duneHeight));
    const tw = house.userData.twinklers;
    let acc = 0;
    group.add(makeRidge({ z: -115, h: 50, seed: 13, snowLine: 0.36, snow: '#dfe8f7' }));
    return { group, update: (t) => { updaters.forEach((u) => u(t)); if (t - acc > 0.12) { acc = t; tw.forEach((s) => s.userData.twinkle(t)); } }, fog: ['#0a1830', 0.0105], snow: 0.8, exposure: 1.05 };
  },

  town(ctx) {
    const { group, updaters } = outdoorBase(ctx, {
      sky: { top: '#03060f', mid: '#0e1d3c', horizon: '#33405e', glow: '#ff9a52', glowStrength: 0.25, band: '#6a86c0', bandStrength: 0.4 },
      moon: [-140, 130, -320, 26], groundColor: '#283554', height: flat, seed: 7,
      hemi: ['#5c74a8', '#1a1620', 0.8], dir: ['#c0d0ff', 0.8, [-30, 50, -20]],
    });
    const walls = ['#b5483c', '#e8d9b8', '#5f8a8b', '#8c5a3c', '#d9a441', '#3f5d7a', '#c96f4a', '#e3c9a8'];
    const roofs = ['#2b2a33', '#4a2a26', '#1f2c36', '#3a2420'];
    const pal = [['#ff4d5a', '#ffd36b', '#7cf0c8'], ['#ffd89a'], ['#5cc8ff', '#ffffff'], ['#ff7aa8', '#ffd36b']];
    const r = rng(12);
    const tw = [];
    for (let i = 0; i < 9; i++) {
      const a = -1.15 + (i / 8) * 2.3 + (r() - 0.5) * 0.08;
      const R = 27 + r() * 4;
      const w = 5 + r() * 2.5, h = 3.4 + r() * 2.4;
      const house = makeHouse({ w, h, d: 4.5 + r() * 1.5, roof: 2 + r() * 1.6, wall: walls[i % walls.length], roofColor: roofs[i % roofs.length], lights: i % 2 === 0 ? pal[(i / 2) % pal.length] : null, chimney: r() < 0.6 });
      house.position.set(Math.sin(a) * R, 0, -Math.cos(a) * R - 2);
      house.rotation.y = -a;
      group.add(house); tw.push(...house.userData.twinklers);
    }
    for (let i = 0; i < 6; i++) {
      const a = -0.95 + (i / 5) * 1.9;
      const l = makeLamp(); l.position.set(Math.sin(a) * 17, 0, -Math.cos(a) * 17 - 1); group.add(l);
    }
    const pl = new THREE.PointLight('#ffa860', 60, 50, 1.4); pl.position.set(0, 6, -20); group.add(pl);
    group.add(makePines(scatterPines(40, 41, 36, 100, frontCorridor), flat));
    let acc = 0;
    return { group, update: (t) => { updaters.forEach((u) => u(t)); if (t - acc > 0.12) { acc = t; tw.forEach((s) => s.userData.twinkle(t)); } }, fog: ['#121a33', 0.0105], snow: 1.25, exposure: 1.05 };
  },

  fireplace(ctx) {
    const group = new THREE.Group();
    const updaters = [];
    const wallTex = canvasTex(128, 128, (g, w) => {
      g.fillStyle = '#1b2a44'; g.fillRect(0, 0, w, w);
      g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(0, 0, 30, w); g.fillRect(64, 0, 30, w);
      g.fillStyle = 'rgba(232,196,120,0.45)';
      for (const [x, y] of [[32, 32], [96, 96]]) { g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 4, y); g.lineTo(x, y + 7); g.lineTo(x - 4, y); g.closePath(); g.fill(); }
    });
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(14, 5);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(100, 30), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }));
    wall.position.set(0, 15, -11); group.add(wall);
    const wains = new THREE.Mesh(new THREE.BoxGeometry(100, 3.6, 0.3), new THREE.MeshStandardMaterial({ color: '#3a2418', roughness: 0.7 }));
    wains.position.set(0, 1.8, -10.85); group.add(wains);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(100, 0.2, 0.42), new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.4, metalness: 0.5 }));
    rail.position.set(0, 3.65, -10.8); group.add(rail);
    const floorTex = canvasTex(256, 256, (g, w) => {
      const r = rng(3);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) {
        const v = 0.75 + r() * 0.3;
        g.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(100 * v)},${Math.round(64 * v)})`;
        const off = (i % 2) * 64;
        g.fillRect(j * 128 + off - (j ? 0 : 0), i * 32, 128, 32);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, i * 32 + 31, w, 1); g.fillRect((j * 128 + off) % w, i * 32, 2, 32);
      }
    });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(9, 5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 50), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = 12; group.add(floor);
    const rugTex = canvasTex(256, 256, (g, w) => {
      const c = w / 2;
      [['#efe3cc', 128], ['#9c2a33', 120], ['#efe3cc', 112], ['#2f5a46', 100], ['#efe3cc', 92], ['#9c2a33', 60], ['#efe3cc', 52], ['#c9a35a', 20]].forEach(([col, rr]) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, rr, 0, 7); g.fill(); });
    });
    const rug = new THREE.Mesh(new THREE.CircleGeometry(7.2, 64), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }));
    rug.rotation.x = -Math.PI / 2; rug.position.y = 0.02; group.add(rug);

    // 壁炉
    const fp = new THREE.Group();
    const stoneTex = canvasTex(128, 128, (g, w) => {
      const r = rng(6); g.fillStyle = '#3a3230'; g.fillRect(0, 0, w, w);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { const v = 110 + r() * 50; g.fillStyle = `rgb(${v},${v * 0.9},${v * 0.82})`; g.beginPath(); g.roundRect((x + (y % 2) * 0.5) * 32 - 14, y * 16 + 1, 30, 14, 4); g.fill(); }
    });
    const stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95 });
    const sur = new THREE.Mesh(new THREE.BoxGeometry(7.4, 6.2, 1.6), stone); sur.position.y = 3.1; fp.add(sur);
    const open = new THREE.Mesh(new THREE.BoxGeometry(3.9, 3.2, 1.0), new THREE.MeshBasicMaterial({ color: '#0b0605' })); open.position.set(0, 1.75, 0.36); fp.add(open);
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.35, 2.8), new THREE.MeshStandardMaterial({ color: '#2a2320', roughness: 0.9 })); hearth.position.set(0, 0.17, 0.7); fp.add(hearth);
    const mantel = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.42, 2.0), new THREE.MeshStandardMaterial({ color: '#5a3a26', roughness: 0.6 })); mantel.position.set(0, 6.3, 0.3); fp.add(mantel);
    for (const ry of [0.3, -0.3]) { const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 8), new THREE.MeshStandardMaterial({ color: '#3a2216' })); log.rotation.set(0, ry, Math.PI / 2); log.position.set(0, 0.55, 0.6); fp.add(log); }
    const fire = makeFire(Math.round(160 * QN[ctx.quality] + 40)); fire.position.set(0, 0.6, 0.7); fp.add(fire); updaters.push(fire.userData.update);
    const fglow = glowSprite('#ff8a3a', 6, 0.55); fglow.position.set(0, 1.4, 1.0); fp.add(fglow);
    const flame = new THREE.PointLight('#ff7a2e', 55, 30, 1.4); flame.position.set(0, 2, 2.8); fp.add(flame);
    // 壁炉台上的松枝和小灯
    const garl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.26, 0), new THREE.MeshStandardMaterial({ color: '#1f5a3a', flatShading: true }), 34);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 34; i++) { const x = -3.9 + i * 0.236; garl.setMatrixAt(i, m4.makeTranslation(x, 6.62 + Math.sin(i) * 0.05, 1.15 - Math.abs(Math.sin(i * 0.8)) * 0.1)); }
    fp.add(garl);
    const mlights = stringLights([new THREE.Vector3(-3.9, 6.55, 1.32), new THREE.Vector3(-1.3, 6.3, 1.38), new THREE.Vector3(1.3, 6.3, 1.38), new THREE.Vector3(3.9, 6.55, 1.32)], ['#ffd89a', '#ffd89a', '#ff7a5a'], 22); fp.add(mlights);
    // 圣诞袜
    const sock = new THREE.Shape();
    sock.moveTo(-0.45, 0); sock.lineTo(0.45, 0); sock.lineTo(0.45, -1.5); sock.quadraticCurveTo(0.45, -1.9, 0.95, -1.95); sock.quadraticCurveTo(1.35, -2.0, 1.3, -2.35); sock.quadraticCurveTo(1.25, -2.7, 0.6, -2.7); sock.lineTo(-0.15, -2.7); sock.quadraticCurveTo(-0.45, -2.7, -0.45, -2.3); sock.closePath();
    const sockGeo = new THREE.ExtrudeGeometry(sock, { depth: 0.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
    [['#b3202f', -2.3], ['#1f5a3a', 0.2], ['#b3202f', 2.5]].forEach(([c, x]) => {
      const s = new THREE.Mesh(sockGeo, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); s.position.set(x, 6.05, 1.2); fp.add(s);
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.36), new THREE.MeshStandardMaterial({ color: '#f3ede2', roughness: 1 })); cuff.position.set(x, 5.9, 1.33); fp.add(cuff);
    });
    fp.position.set(-12, 0, -10.2); group.add(fp);

    // 窗户（窗外是雪夜）
    const winTex = canvasTex(256, 320, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#071430'); gr.addColorStop(1, '#2a4a74'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const r = rng(4); g.fillStyle = '#fff';
      for (let i = 0; i < 60; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.fillRect(r() * w, r() * h * 0.6, 1.5, 1.5); }
      g.globalAlpha = 1; g.fillStyle = '#f6f1df'; g.beginPath(); g.arc(184, 70, 18, 0, 7); g.fill();
      g.fillStyle = '#0d1f36';
      for (let i = 0; i < 7; i++) { const x = i * 40 + 10, b = 250; g.beginPath(); g.moveTo(x, b - 70 - (i % 3) * 14); g.lineTo(x + 18, b); g.lineTo(x - 18, b); g.fill(); }
      g.fillStyle = '#cfdcee'; g.beginPath(); g.moveTo(0, 260); g.quadraticCurveTo(90, 230, 160, 262); g.quadraticCurveTo(220, 284, 256, 250); g.lineTo(256, 320); g.lineTo(0, 320); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 1.6, 0, 7); g.fill(); }
    });
    const win = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 6), new THREE.MeshBasicMaterial({ map: winTex, color: new THREE.Color(1.15, 1.15, 1.25) })); win.add(glass);
    const frameMat = new THREE.MeshStandardMaterial({ color: '#e8dcc6', roughness: 0.7 });
    for (const [x, y, ww, hh] of [[0, 3.1, 5.4, 0.3], [0, -3.1, 5.6, 0.36], [-2.55, 0, 0.3, 6.4], [2.55, 0, 0.3, 6.4], [0, 0, 0.16, 6], [0, 0.6, 4.8, 0.16]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 0.3), frameMat); b.position.set(x, y, 0.1); win.add(b); }
    const curtainTex = canvasTex(256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? '#5a1420' : '#8e2a36'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 8.6), new THREE.MeshStandardMaterial({ map: curtainTex, roughness: 1, side: THREE.DoubleSide })); c.position.set(s * 3.5, -0.8, 0.35); win.add(c); }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 9.4, 8), new THREE.MeshStandardMaterial({ color: '#b08a4a', metalness: 0.6, roughness: 0.3 })); rod.rotation.z = Math.PI / 2; rod.position.set(0, 3.6, 0.4); win.add(rod);
    win.position.set(11, 8, -10.85); group.add(win);
    const wglow = glowSprite('#8fb4ff', 9, 0.12); wglow.position.set(11, 8, -9.8); group.add(wglow);

    // 墙上花环
    const wr = new THREE.Group();
    wr.add(new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.4, 8, 28), new THREE.MeshStandardMaterial({ color: '#1f5a3a', roughness: 0.8, flatShading: true })));
    const wrl = stringLights(Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0.42); }), ['#ffd89a', '#ff5a6a'], 18);
    wr.add(wrl);
    for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 6), new THREE.MeshStandardMaterial({ color: '#b3202f' })); b.rotation.z = s * Math.PI / 2; b.position.set(s * 0.38, -1.3, 0.45); wr.add(b); }
    wr.position.set(0, 14.6, -10.7); group.add(wr);

    // 落地灯 + 扶手椅
    const lamp = new THREE.Group();
    const brass = new THREE.MeshStandardMaterial({ color: '#b08a4a', metalness: 0.7, roughness: 0.35 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.2, 8), brass); pole.position.y = 3.1; lamp.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.15, 20), brass); base.position.y = 0.08; lamp.add(base);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.35, 1.3, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#f3dfb8', emissive: '#ffb766', emissiveIntensity: 1.3, side: THREE.DoubleSide })); shade.position.y = 6.4; lamp.add(shade);
    const lg = glowSprite('#ffc27a', 6, 0.5); lg.position.y = 6.2; lamp.add(lg);
    const lampLight = new THREE.PointLight('#ffc27a', 30, 26, 1.5); lampLight.position.y = 5.6; lamp.add(lampLight);
    lamp.position.set(16, 0, -6.5); group.add(lamp);
    const chair = new THREE.Group(), velvet = new THREE.MeshStandardMaterial({ color: '#7a1e2b', roughness: 0.85 });
    for (const [x, y, z, w, h, d] of [[0, 1.0, 0, 3.0, 0.8, 2.6], [0, 2.3, -1.15, 3.0, 2.6, 0.5], [-1.5, 1.6, 0, 0.5, 1.4, 2.6], [1.5, 1.6, 0, 0.5, 1.4, 2.6]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), velvet); b.position.set(x, y, z); chair.add(b); }
    for (const [x, z] of [[-1.3, 1.1], [1.3, 1.1], [-1.3, -1.1], [1.3, -1.1]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.6, 6), new THREE.MeshStandardMaterial({ color: '#2a1a12' })); l.position.set(x, 0.3, z); chair.add(l); }
    chair.position.set(13, 0, -2); chair.rotation.y = -0.7; group.add(chair);

    group.add(new THREE.HemisphereLight('#ffd7a8', '#2a1810', 0.55));
    const dust = makeSnow(Math.round(500 * QN[ctx.quality]), { color: '#ffcf8a', fall: -0.12, size: 2.2, area: [60, 22, 40] });
    group.add(dust); updaters.push(dust.userData.update);
    let acc = 0;
    return {
      group,
      update: (t) => {
        updaters.forEach((u) => u(t));
        flame.intensity = 50 + Math.sin(t * 13) * 6 + Math.sin(t * 7.3) * 8;
        fglow.material.opacity = 0.5 + Math.sin(t * 9) * 0.06;
        if (t - acc > 0.12) { acc = t; mlights.userData.twinkle(t); wrl.userData.twinkle(t); }
      },
      fog: ['#140d0a', 0.012], snow: 0, background: '#0d0908', exposure: 1.0, indoor: true,
    };
  },
};

export function buildScene(id, ctx) {
  const key = builders[id] ? id : 'snowfield';   // 旧版的「月下松林」已并进雪原
  const s = builders[key](ctx);
  s.id = key;
  return s;
}
