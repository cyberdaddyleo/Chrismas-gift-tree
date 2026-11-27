import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DecoratedTree, TREE, treeRadius } from './tree.js';
import { SCENES, buildScene } from './scenes.js';
import { makeSnow } from './fx.js';
import { PRESETS, presetById, makeCardTexture, makeMysteryTexture, iconDataUri, THEMES } from './gifts.js';
import { GestureController } from './gesture.js';
import { Sound } from './audio.js';
import { clamp, lerp, approach, easeInOut, glowSprite, glowTexture, disposeTree, escapeHTML } from './util.js';

const $ = (id) => document.getElementById(id);
const MAX_GIFTS = 12;
const VERSIONS = ['boy', 'girl', 'baby'];
const VER_INFO = {
  boy: { name: '男生版', desc: '游戏机、皮肤、球衣、球鞋…', sw: ['#16345e', '#6cc4ff'] },
  girl: { name: '女生版', desc: '口红、包包、高跟鞋、香水…', sw: ['#8a2448', '#ff8fb1'] },
  baby: { name: '宝宝版', desc: '奶瓶、摇铃、小黄鸭，男宝女宝都有', sw: ['#3c7a68', '#ffe08a'] },
};

// 单文件版：启动时先留一份页面原文，用来生成「TA 的专属文件」
const SINGLE = !!globalThis.__GT_ASSETS__;
const PAGE_SRC = SINGLE ? '<!DOCTYPE html>\n' + document.documentElement.outerHTML : null;
const PRESET = globalThis.__GT_PRESET__ || null;
const STORE_KEY = PRESET ? 'giftTree.v3.' + PRESET.id : 'giftTree.v3';

// ================= 状态 =================
const GIFT_MSG = '这一年辛苦啦，树上挂着的，都是给你的礼物。';
const BLIND_MSG = '每个盲盒里都藏着一份圣诞礼物，抽一个，试试手气。';
const state = {
  to: '宝宝', msg: GIFT_MSG, from: '', v: 'girl', s: 'snowfield', quality: 'high', music: true,
  gifts: { boy: PRESETS.boy.slice(0, 8).map((g) => g.id), girl: PRESETS.girl.slice(0, 8).map((g) => g.id), baby: PRESETS.baby.slice(0, 10).map((g) => g.id) },
  custom: [],
  blind: false, counts: {}, deplete: true, history: [],   // 盲盒抽奖：模式、每样奖品剩几份、抽中是否扣减、抽奖记录
  camView: true,                                           // 右下角是否显示摄像头画面
};
function loadState() {
  if (PRESET) {
    for (const k of ['to', 'msg', 'from', 's', 'music', 'blind', 'deplete']) if (PRESET[k] !== undefined) state[k] = PRESET[k];
    if (VERSIONS.includes(PRESET.v)) state.v = PRESET.v;
    if (PRESET.gifts) state.gifts = { ...state.gifts, ...PRESET.gifts };
    if (Array.isArray(PRESET.custom)) state.custom = PRESET.custom;
    if (PRESET.counts) state.counts = { ...PRESET.counts };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved) { Object.assign(state, saved); state.gifts = { ...{ baby: PRESETS.baby.slice(0, 10).map((g) => g.id) }, ...saved.gifts }; }
  } catch (_) {}
  const q = new URLSearchParams(location.search);
  if (q.has('to')) state.to = q.get('to').slice(0, 12);
  if (q.has('msg')) state.msg = q.get('msg').slice(0, 60);
  if (q.has('from')) state.from = q.get('from').slice(0, 12);
  if (VERSIONS.includes(q.get('v'))) state.v = q.get('v');
  if (q.has('s') && SCENES.some((s) => s.id === q.get('s'))) state.s = q.get('s');
  if (q.has('g')) {
    const ids = q.get('g').split(',').filter((id) => PRESETS[state.v].some((g) => g.id === id)).slice(0, MAX_GIFTS);
    if (ids.length) state.gifts[state.v] = ids;
  }
  if (q.get('m') === 'blind') state.blind = true;
  if (q.toString()) state.custom = [];
  if (!VERSIONS.includes(state.v)) state.v = 'girl';
  if (!SCENES.some((s) => s.id === state.s)) state.s = 'snowfield';   // 旧的「月下松林」并进了雪原
  if (!state.counts || typeof state.counts !== 'object') state.counts = {};
  if (!Array.isArray(state.history)) state.history = [];
}
function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {} }
loadState();

// ================= 渲染器 =================
const canvas = $('scene');
// 依次尝试几种设置创建 3D 画面，兼容更多显卡
const renderer = (() => {
  let last;
  for (const o of [{ antialias: true, powerPreference: 'high-performance' }, { antialias: true }, { antialias: false, powerPreference: 'low-power' }]) {
    try { return new THREE.WebGLRenderer({ canvas, ...o }); } catch (e) { last = e; }
  }
  throw last;
})();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 1200);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.42, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let envTex = null;
try { envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; } catch (e) { console.warn('[env] 反射贴图生成失败，改用普通材质', e); }

const PR = { high: Math.min(devicePixelRatio, 2), medium: Math.min(devicePixelRatio, 1.5), low: 1 };
let baseDist = 23;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(PR[state.quality]);
  renderer.setSize(w, h, false);
  composer.setPixelRatio(PR[state.quality]);
  composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  baseDist = w / h < 1.1 ? 31 : 23;
}
addEventListener('resize', resize);

// ================= 世界 =================
const treeRoot = new THREE.Group();
scene.add(treeRoot);
const tree = new DecoratedTree({ quality: state.quality, theme: state.v, envMap: envTex });
treeRoot.add(tree.group);
const treeLight = new THREE.PointLight('#ffcf8a', 16, 20, 1.4);
treeLight.position.set(0, 3.6, 4);
scene.add(treeLight);
const rimLight = new THREE.DirectionalLight('#9fb8ff', 0.9);
rimLight.position.set(-6, 10, -8);
scene.add(rimLight);
let snow = null, bokeh = null, env = null;

function makeGlobalSnow() {
  for (const s of [snow, bokeh]) if (s) { scene.remove(s); disposeTree(s); }
  snow = makeSnow({ high: 3400, medium: 2100, low: 1100 }[state.quality], { size: 2.8 });
  bokeh = makeSnow({ high: 70, medium: 45, low: 0 }[state.quality] || 1, { size: 18, fall: 0.25, area: [26, 18, 9], center: [0, 0, 13], alpha: 0.09 });
  scene.add(snow, bokeh);
}
makeGlobalSnow();

function applyScene(id) {
  if (env) { scene.remove(env.group); disposeTree(env.group); }
  env = buildScene(id, { quality: state.quality });
  scene.add(env.group);
  scene.fog = new THREE.FogExp2(env.fog[0], env.fog[1]);
  scene.background = new THREE.Color(env.background || env.fog[0]);
  renderer.toneMappingExposure = env.exposure || 1;
  snow.visible = bokeh.visible = env.snow > 0;
  snow.userData.mat.uniforms.uFall.value = env.snow || 1;
  treeLight.intensity = env.indoor ? 12 : 16;
}

// ================= 礼物相框卡片 =================
const frameGeo = (() => {
  const o = 0.56, r = 0.05, h = 0.47;
  const s = new THREE.Shape();
  s.moveTo(-o + r, -o); s.lineTo(o - r, -o); s.quadraticCurveTo(o, -o, o, -o + r); s.lineTo(o, o - r); s.quadraticCurveTo(o, o, o - r, o);
  s.lineTo(-o + r, o); s.quadraticCurveTo(-o, o, -o, o - r); s.lineTo(-o, -o + r); s.quadraticCurveTo(-o, -o, -o + r, -o);
  const hole = new THREE.Path(); hole.moveTo(-h, -h); hole.lineTo(-h, h); hole.lineTo(h, h); hole.lineTo(h, -h); hole.lineTo(-h, -h);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.024, bevelThickness: 0.024, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, 0, -0.025);
  return g;
})();
const picGeo = new THREE.PlaneGeometry(0.95, 0.95);
const backGeo = new THREE.PlaneGeometry(1.12, 1.12);
let cards = [];
let activeCard = null;
let draw = null;            // 盲盒抽奖进行中：{ card, prize, phase: fly→suspense→flip→shown, t }
let cardBuildId = 0;
let mysteryTex = null;
const giftTex = new Map();

function currentGifts() {
  return [...state.gifts[state.v].map(presetById).filter(Boolean), ...state.custom].slice(0, MAX_GIFTS);
}

async function rebuildCards() {
  const id = ++cardBuildId;
  const gifts = currentGifts();
  const texes = await Promise.all(gifts.map((g) => makeCardTexture(g, state.v)));
  try { await document.fonts.load('italic 500 120px "PF"'); } catch (_) {}
  if (id !== cardBuildId) { texes.forEach((t) => t.dispose()); return; }
  for (const c of cards) { scene.remove(c.group, c.glow); disposeTree(c.group); c.glow.material.dispose(); }
  for (const t of giftTex.values()) t.dispose();
  giftTex.clear();
  gifts.forEach((g, i) => giftTex.set(g.id, texes[i]));
  if (mysteryTex) mysteryTex.dispose();
  mysteryTex = makeMysteryTexture(state.v);
  activeCard = null; draw = null; hideCaption(); updateDrawBtn();
  const th = THEMES[state.v];
  const frameMat = new THREE.MeshStandardMaterial({ color: th.frame, metalness: 0.8, roughness: 0.5, envMap: envTex, envMapIntensity: 0.18, transparent: true });
  const backMat = new THREE.MeshStandardMaterial({ color: '#1a1f2c', roughness: 0.7, transparent: true });
  const n = gifts.length;
  cards = gifts.map((gift, i) => {
    const t = 0.12 + ((i + 0.5) / Math.max(n, 1)) * 0.7;
    const ang = i * 2.39996 + 0.6;
    const R = treeRadius(t) + 0.55;
    const treePos = new THREE.Vector3(Math.cos(ang) * R, TREE.baseY + t * TREE.height - 0.1, Math.sin(ang) * R);
    const sa = (i / n) * Math.PI * 2 + 0.4, sr = 8.4 + (i % 3) * 1.5;
    const scatterPos = new THREE.Vector3(Math.cos(sa) * sr, 3 + ((i * 7) % 5) * 1.25, Math.sin(sa) * sr);
    const group = new THREE.Group();
    const frame = new THREE.Mesh(frameGeo, frameMat.clone());
    const pic = new THREE.Mesh(picGeo, new THREE.MeshBasicMaterial({ map: state.blind ? mysteryTex : texes[i], transparent: true, color: new THREE.Color(0.74, 0.74, 0.74) }));
    const back = new THREE.Mesh(backGeo, backMat); back.rotation.y = Math.PI; back.position.z = -0.03;
    group.add(frame, pic, back);
    const glow = glowSprite('#fff2d6', 2.6, 0.06);
    glow.renderOrder = 1;
    scene.add(glow, group);
    const card = { gift, group, frame, pic, glow, treePos, scatterPos, phase: i * 1.37, k: 0, delay: (i / n) * 0.35, face: state.blind ? 'mystery' : 'own' };
    group.userData.card = card;
    return card;
  });
}
function setFace(card, tex) { if (tex && card.pic.material.map !== tex) { card.pic.material.map = tex; card.pic.material.needsUpdate = true; } }

// ================= 交互状态 =================
let mix = 1, mixTarget = 1;
let rotVel = 0, dragVel = 0;
let camDist = 23, camPitch = 0.1, handPitch = 0;
let introOpen = true;
const timer = new THREE.Timer();
const MAX_DT = location.hash === '#test' ? 0.4 : 0.05;
let time = 0;

function setMix(target, sound = true) {
  if (mixTarget === target) return;
  mixTarget = target;
  if (sound && !introOpen) audio.whoosh(target === 1);
  const b = $('btnMix');
  b.querySelector('.lbl').textContent = target ? '聚合' : '散开';
  b.querySelector('.ic-scatter').style.display = target ? 'none' : '';
  b.querySelector('.ic-tree').style.display = target ? '' : 'none';
}

const burst = (() => {
  const n = 110, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 0.14, map: glowTexture(), color: '#ffe2a0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geo, mat); pts.visible = false; pts.frustumCulled = false; pts.renderOrder = 12;
  scene.add(pts);
  let t = -1;
  return {
    fire(at, color, power = 1) {
      mat.color.set(color);
      for (let i = 0; i < n; i++) {
        pos.set([at.x, at.y, at.z], i * 3);
        const v = new THREE.Vector3().randomDirection().multiplyScalar((1.5 + Math.random() * 3.5) * power);
        vel.set([v.x, v.y, v.z], i * 3);
      }
      geo.attributes.position.needsUpdate = true; t = 0; pts.visible = true;
    },
    update(dt) {
      if (t < 0) return;
      t += dt;
      for (let i = 0; i < n * 3; i++) { pos[i] += vel[i] * dt; vel[i] *= 0.95; }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = Math.max(0, 1 - t / 1.3);
      if (t > 1.3) { t = -1; pts.visible = false; }
    },
  };
})();

const showTarget = new THREE.Vector3();
function aimShowTarget() {
  camera.getWorldDirection(showTarget);
  showTarget.multiplyScalar(8).add(camera.position);
}
// 送礼模式：拆开看；盲盒模式：转去抽奖
function openCard(card) {
  if (!card || activeCard === card) return;
  if (state.blind) return startDraw(card);
  activeCard = card; card.face = 'own'; setFace(card, giftTex.get(card.gift.id));
  audio.chime();
  aimShowTarget();
  burst.fire(showTarget, THEMES[state.v].accent);
  showCaption(`送给 ${state.to || '你'} 的礼物`, card.gift.name, card.gift.line, gesture.running ? '松开手指，礼物会回到树上' : '点空白处放回树上');
}
function closeCard(force) {
  if (!activeCard) return;
  if (draw && draw.phase !== 'shown' && !force) return; // 揭晓之前不打断
  activeCard = null; draw = null;
  hideCaption(); updateDrawBtn();
}

// ================= 盲盒抽奖 =================
// 按剩余份数加权抽一个
function pickPrize() {
  const pool = currentGifts().map((g) => ({ g, n: Math.max(0, state.counts[g.id] ?? 1) })).filter((x) => x.n > 0);
  const total = pool.reduce((a, x) => a + x.n, 0);
  if (!total) return null;
  let r = Math.random() * total;
  for (const x of pool) { r -= x.n; if (r < 0) return x.g; }
  return pool[pool.length - 1].g;
}
function startDraw(card) {
  if (draw && draw.phase !== 'shown') return;
  if (activeCard) { closeCard(); return; }
  if (!cards.length) return;
  if (!card) {
    // 没指定就从画面里随机挑一个盲盒
    const vis = cards.filter((c) => { tmp.copy(c.group.position).project(camera); return Math.abs(tmp.x) < 0.9 && Math.abs(tmp.y) < 0.9 && tmp.z < 1; });
    const from = vis.length ? vis : cards;
    card = from[Math.floor(Math.random() * from.length)];
  }
  const prize = pickPrize();
  if (!prize) { toast('奖品已经抽完了，去「设置奖池」里补充份数'); return; }
  if (state.deplete) state.counts[prize.id] = Math.max(0, (state.counts[prize.id] ?? 1) - 1);
  state.history.unshift({ name: prize.name, t: Date.now() });
  state.history = state.history.slice(0, 200);
  saveState(); renderPool();
  activeCard = card; card.face = 'mystery'; setFace(card, mysteryTex);
  draw = { card, prize, phase: 'fly', t: 0, tick: 0 };
  aimShowTarget();
  audio.whoosh(true);
  hideCaption(); updateDrawBtn();
}
const isThanks = (g) => g && g.icon === 'thanks';
// 底部「抽一个」按钮：抽奖中变灰，揭晓后变成「再抽一个」
function updateDrawBtn() {
  const b = $('btnDraw'); if (!b) return;
  const busy = !!draw && draw.phase !== 'shown';
  b.disabled = busy;
  b.querySelector('.t').textContent = busy ? '抽奖中…' : draw ? '再抽一个' : '抽一个';
  const gifts = currentGifts();
  const left = gifts.reduce((a, g) => a + Math.max(0, state.counts[g.id] ?? 1), 0);
  const real = gifts.filter((g) => !isThanks(g)).reduce((a, g) => a + Math.max(0, state.counts[g.id] ?? 1), 0);
  $('drawMeta').textContent = (state.deplete ? `奖品还剩 ${real} 份` : `共 ${left} 份奖品`) + (state.history.length ? ` · 已抽 ${state.history.length} 次` : '');
}
function drawNext() {
  if (draw && draw.phase !== 'shown') return;
  if (activeCard) { closeCard(); setTimeout(() => startDraw(), 420); }
  else startDraw();
}

// ================= 每帧 =================
const tmp = new THREE.Vector3(), yAxis = new THREE.Vector3(0, 1, 0), camDir = new THREE.Vector3();
let fpsAcc = 0, fpsFrames = 0, fpsChecked = false, fpsStart = 0;

function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), MAX_DT);
  time += dt;
  const now = performance.now();
  gesture.update(now);
  updateHandUI();

  mix = approach(mix, mixTarget, dt * 0.72);
  tree.update(time, mix, dt);

  let steer = 0;
  if (gesture.hand.visible && gesture.stable === 'open') {
    const dx = gesture.hand.x - 0.5;
    steer = Math.abs(dx) > 0.1 ? (dx - Math.sign(dx) * 0.1) * 3.2 : 0;
    handPitch = lerp(handPitch, (gesture.hand.y - 0.5) * 0.3, 0.05);
  } else handPitch = lerp(handPitch, 0, 0.05);
  const idle = activeCard ? 0.02 : lerp(0.12, 0.05, mix);
  rotVel = lerp(rotVel, idle + steer, 0.05);
  dragVel *= Math.pow(0.04, dt);
  treeRoot.rotation.y += (rotVel + dragVel) * dt;

  const dist = lerp(camDist * (baseDist / 23), camDist * (baseDist / 23) + 5, easeInOut(mix));
  const pitch = clamp(camPitch + handPitch, -0.04, 0.42);
  const sway = Math.sin(time * 0.13) * 0.035;
  camera.position.set(Math.sin(sway) * dist * Math.cos(pitch), 5.0 + Math.sin(pitch) * dist, Math.cos(sway) * dist * Math.cos(pitch));
  camera.lookAt(0, 5.0 + mix * 0.5, 0);
  camera.updateMatrixWorld();
  camera.getWorldDirection(camDir);
  if (activeCard) showTarget.copy(camDir).multiplyScalar(8).add(camera.position).addScaledVector(camera.up, 0.45);

  // 盲盒：飞到眼前 → 停顿抖动（越来越快的鼓点）→ 翻面揭晓 → 停住等下一步
  let shakeZ = 0, flip = 0, pulse = 1;
  if (draw) {
    draw.t += dt;
    const c = draw.card;
    if (draw.phase === 'fly' && c.k >= 0.999) { draw.phase = 'suspense'; draw.t = 0; }
    if (draw.phase === 'suspense') {
      const u = Math.min(1, draw.t / 1.5);
      shakeZ = Math.sin(draw.t * (24 + u * 30)) * 0.06 * (0.3 + u);
      pulse = 1 + Math.sin(draw.t * 9) * 0.025 * u;
      draw.tick -= dt;
      if (draw.tick <= 0) { audio.tick(0.4 + u * 0.6); draw.tick = 0.16 - u * 0.1; }
      if (draw.t >= 1.5) { draw.phase = 'flip'; draw.t = 0; }
    }
    if (draw.phase === 'flip') {
      const u = Math.min(1, draw.t / 0.6);
      flip = easeInOut(u) * Math.PI * 2;
      if (flip > Math.PI && c.face !== 'prize') { c.face = 'prize'; setFace(c, giftTex.get(draw.prize.id) || mysteryTex); }
      if (u >= 1) {
        draw.phase = 'shown';
        const p = draw.prize, miss = isThanks(p);
        if (miss) audio.chime(); else { audio.fanfare(); burst.fire(c.group.position, '#ffd98a', 1.5); }
        showCaption(miss ? '差一点点' : '恭喜抽中', p.name, p.line || '', gesture.running ? '再捏一下抽下一个 · 张开手或握拳收起' : '点「再抽一个」继续 · 点空白处收起', !miss);
        updateDrawBtn();
      }
    }
  }

  const ry = treeRoot.rotation.y;
  const anyK = cards.reduce((m, c) => Math.max(m, c.k), 0);
  for (const c of cards) {
    c.k = approach(c.k, c === activeCard ? 1 : 0, dt * (c === activeCard ? 1.9 : 2.4));
    if (c !== activeCard && c.k < 0.05) {
      const want = state.blind ? 'mystery' : 'own';
      if (c.face !== want) { c.face = want; setFace(c, want === 'mystery' ? mysteryTex : giftTex.get(c.gift.id)); }
    }
    const lm = easeInOut(clamp((mix - c.delay) / 0.65, 0, 1));
    tmp.lerpVectors(c.treePos, c.scatterPos, lm);
    tmp.y += Math.sin(time * 1.1 + c.phase) * (0.05 + lm * 0.35);
    tmp.applyAxisAngle(yAxis, ry + lm * Math.sin(time * 0.05 + c.phase) * 0.2);
    const ke = easeInOut(c.k);
    c.group.position.lerpVectors(tmp, showTarget, ke);
    const sc = lerp(lerp(0.95, 1.35, lm), 2.4, ke) * (c === activeCard ? pulse : 1);
    c.group.scale.setScalar(sc);
    c.group.quaternion.copy(camera.quaternion);
    if (c === activeCard && draw) {
      if (draw.phase === 'fly') c.group.rotateY((1 - ke) * Math.PI * 1.5);
      c.group.rotateY(flip);
      c.group.rotateZ(shakeZ);
    } else if (c.k > 0 && c.k < 1) c.group.rotateY((1 - ke) * Math.PI * 2 * (c === activeCard ? 1 : -1));
    c.group.rotateZ(Math.sin(time * 1.3 + c.phase) * 0.06 * (1 - ke));
    const dim = c === activeCard ? 1 : 1 - anyK * 0.7;
    c.pic.material.opacity = dim; c.frame.material.opacity = dim;
    c.glow.position.copy(c.group.position).addScaledVector(camDir, 0.06);
    c.glow.scale.setScalar(sc * (2.3 + ke * 1.1));
    c.glow.material.opacity = (0.05 * (1 - ke) + (draw && c === activeCard ? ke * (draw.phase === 'shown' ? 0.1 : 0.07 + 0.05 * Math.sin(time * 8)) : 0)) * dim;
    const ro = c.k > 0 ? 10 : 3;
    c.group.traverse((o) => (o.renderOrder = ro));
  }

  burst.update(dt);
  if (env) env.update(time);
  snow.userData.update(time); bokeh.userData.update(time);
  composer.render();

  if (!introOpen && !fpsChecked) {
    if (!fpsStart) fpsStart = now;
    fpsAcc += dt; fpsFrames++;
    if (now - fpsStart > 3500) {
      fpsChecked = true;
      if (fpsFrames / fpsAcc < 32 && state.quality !== 'low') {
        setQuality(state.quality === 'high' ? 'medium' : 'low');
        toast('电脑有点吃力，已自动调低画质，保证流畅');
      }
    }
  }
  requestAnimationFrame(frame);
}

// ================= 拾取 =================
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function cardAtScreen(px, py) {
  ndc.set((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(cards.map((c) => c.group), true);
  for (const h of hits) { let o = h.object; while (o && !o.userData.card) o = o.parent; if (o) return o.userData.card; }
  return null;
}
function nearestCard(px, py) {
  let best = null, bd = Infinity;
  for (const c of cards) {
    tmp.copy(c.group.position).project(camera);
    if (tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05) continue;
    const d = Math.hypot((tmp.x + 1) / 2 * innerWidth - px, (1 - tmp.y) / 2 * innerHeight - py);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// ================= 鼠标 / 键盘 =================
let down = null;
canvas.addEventListener('pointerdown', (e) => { closePops(); down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!down) { canvas.style.cursor = cardAtScreen(e.clientX, e.clientY) ? 'pointer' : 'grab'; return; }
  const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
  down.lx = e.clientX; down.ly = e.clientY;
  treeRoot.rotation.y += dx * 0.006;
  dragVel = dx * 0.35;
  camPitch = clamp(camPitch + dy * 0.002, -0.04, 0.38);
  canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 350) {
    const c = cardAtScreen(e.clientX, e.clientY);
    if (state.blind) { if (activeCard) closeCard(); else if (c) startDraw(c); }
    else if (c) { if (c === activeCard) closeCard(); else openCard(c); }
    else if (activeCard) closeCard();
  }
  down = null;
});
canvas.addEventListener('dblclick', (e) => { if (state.blind && activeCard) return; if (!cardAtScreen(e.clientX, e.clientY)) { closeCard(); setMix(mixTarget ? 0 : 1); } });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); camDist = clamp(camDist + e.deltaY * 0.01, 13, 34); }, { passive: false });
addEventListener('keydown', (e) => {
  if (/INPUT|TEXTAREA/.test(e.target.tagName) || introOpen) return;
  if (state.blind && (e.code === 'Space' || e.key === 'Enter')) { e.preventDefault(); drawNext(); }
  else if (e.code === 'Space') { e.preventDefault(); closeCard(); setMix(mixTarget ? 0 : 1); }
  else if (e.key === 'Escape') { closePops(); if ($('drawer').classList.contains('open')) toggleDrawer(false); else closeCard(); }
  else if (/^[1-9]$/.test(e.key) && SCENES[+e.key - 1]) switchScene(SCENES[+e.key - 1].id);
  else if (e.key === 'h' || e.key === 'H') toggleGesture();
  else if (e.key === 'm' || e.key === 'M') toggleMusic();
});

// ================= 手势 =================
const audio = new Sound();
const G_NAMES = { open: '张开手掌', fist: '握拳', pinch: '捏合', none: '请举起手' };
// 摄像头画面默认显示在右下角，可以点 × 关掉显示（手势照常识别）
const gesture = new GestureController({
  video: $('camVideo'), canvas: $('camCanvas'),
  onStatus: (kind, msg) => {
    $('camState').textContent = msg;
    setPill(kind === 'loading' ? 'loading' : kind === 'ready' ? 'ready' : 'off', kind === 'loading' ? msg : kind === 'ready' ? '手势识别中 · 请举起手' : '手势控制 · 点我开启');
    if (kind === 'error') { toast(msg); setHandUI(false); }
    if (kind === 'ready') toast(state.blind ? '手势已开启：捏一下手指就是抽一个' : '手势已开启：对着摄像头张开手掌试试');
  },
  onGesture: (g, prev) => {
    if (gesture.ready) setPill(g === 'none' ? 'ready' : 'track', `手势识别中 · <b>${G_NAMES[g]}</b>`);
    if (introOpen) return;
    if (!state.blind && prev === 'pinch' && g !== 'pinch') closeCard();
    if (g === 'open') { closeCard(); setMix(1); }
    else if (g === 'fist') { closeCard(); setMix(0); }
    else if (g === 'pinch') {
      if (state.blind) { if (activeCard) drawNext(); else startDraw(nearestCard(gesture.hand.x * innerWidth, gesture.hand.y * innerHeight)); }
      else { const c = nearestCard(gesture.hand.x * innerWidth, gesture.hand.y * innerHeight); if (c) openCard(c); }
    }
  },
});
function setPill(stateName, html) { const p = $('gpill'); p.dataset.state = stateName; $('gText').innerHTML = html; }
const cursorEl = $('cursor');
function updateHandUI() {
  const h = gesture.hand;
  if (gesture.running && h.visible && !introOpen) {
    cursorEl.style.opacity = 1;
    cursorEl.style.transform = `translate(${h.x * innerWidth}px, ${h.y * innerHeight}px)`;
    cursorEl.dataset.g = gesture.stable;
  } else cursorEl.style.opacity = 0;
}
function setHandUI(on) {
  $('btnHand').classList.toggle('on', on); $('btnHand').setAttribute('aria-pressed', on);
  handOn = on;
  $('cam').hidden = !on;
  applyCamView();
  if (!on) setPill('off', '手势控制 · 点我开启');
  renderHints();
}
let handOn = false;
function applyCamView() {
  $('cam').classList.toggle('off', !state.camView);
  $('camShow').hidden = !(handOn && !state.camView);
}
function setCamView(on) { state.camView = on; saveState(); applyCamView(); }
async function toggleGesture(force) {
  const on = force ?? !gesture.running;
  if (!on) { gesture.stop(); setHandUI(false); return; }
  setHandUI(true);
  const ok = await gesture.start();
  if (!ok) setHandUI(false);
}

// ================= 文案 / 倒计时 / 提示 =================
const IC = {
  mouse: '<svg class="i" viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v3"/></svg>',
  burst: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>',
  pic: '<svg class="i" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 16l5-5 4 4 3-3 4 4"/></svg>',
  key: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 13h10"/></svg>',
};
function renderHints() {
  const L = state.blind
    ? (handOn ? ['<b>捏合</b> 抽一个盲盒', '<b>张开手掌</b> 散开成星河', '<b>握拳</b> 聚回圣诞树']
      : [IC.key + '按<b>空格</b>也能抽', IC.pic + '点树上任意一个盲盒', IC.mouse + '拖动旋转 · 滚轮缩放'])
    : (handOn ? ['<b>张开手掌</b> 散开成星河，左右移手转动', '<b>握拳</b> 聚回圣诞树', '<b>捏合</b> 抓一份礼物，松开放回']
      : [IC.mouse + '拖动旋转 · 滚轮缩放', IC.burst + '双击空白散开 / 聚合', IC.pic + '点相框看礼物']);
  $('hints').innerHTML = L.map((x) => `<span>${x}</span>`).join('');
}
// 盲盒模式下，没改过祝福语就换成抽奖的说法
const shownMsg = () => (state.blind && (!state.msg || state.msg === GIFT_MSG) ? BLIND_MSG : state.msg);
function applyGreeting() {
  const B = state.blind;
  const name = state.to || (B ? '圣诞盲盒' : '你');
  document.body.classList.toggle('blind', B);
  $('gName').textContent = name;
  $('gTail').textContent = B ? ' · 圣诞盲盒' : '，圣诞快乐！';
  $('gMsg').textContent = shownMsg();
  $('gFrom').textContent = state.from ? '—— ' + state.from : '';
  $('brandSub').textContent = B ? '圣诞盲盒' : '雪夜礼物树';
  $('btnEditT').textContent = B ? '设置奖池' : '编辑祝福';
  $('introName').textContent = name;
  $('introTo').textContent = B ? 'Lucky Draw' : 'To';
  $('introSub').textContent = B ? '树上挂满了盲盒，抽一个，看看你的运气' : state.from ? `${state.from} 给你准备了一棵挂满礼物的树` : '有一棵挂满礼物的树，在等你打开';
  $('startHand').textContent = B ? '用手势开始抽奖' : '用手势打开';
  $('startMouse').textContent = B ? '用鼠标开始抽奖' : '用鼠标打开';
  $('lblTo').textContent = B ? '店名 / 活动名' : '收礼人';
  $('fTo').placeholder = B ? '比如：星光奶茶店' : 'TA 的名字或昵称';
  $('lblGifts').firstChild.textContent = B ? '奖品（勾选的会放进奖池） ' : '挂在树上的礼物 ';
  $('btnBlind').classList.toggle('on', B); $('btnBlind').setAttribute('aria-pressed', B);
  document.querySelectorAll('#fMode button').forEach((b) => b.classList.toggle('on', b.dataset.mode === (B ? 'blind' : 'gift')));
  document.title = B ? `${name} · 圣诞盲盒抽奖` : `给${name}的圣诞礼物树`;
  renderHints(); updateDrawBtn();
}
function showCaption(k, name, line, hint, win) {
  $('capK').textContent = k; $('capName').textContent = name; $('capLine').textContent = line || ''; $('capHint').textContent = hint;
  $('caption').classList.toggle('win', !!win);
  $('caption').classList.add('show');
}
function hideCaption() { $('caption').classList.remove('show'); }
let toastTimer;
function toast(msg, ms = 2800) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
const pad = (n) => String(n).padStart(2, '0');
function tick() {
  const now = new Date();
  let xmas = new Date(now.getFullYear(), 11, 25);
  const isToday = now.getMonth() === 11 && now.getDate() === 25;
  if (now > xmas && !isToday) xmas = new Date(now.getFullYear() + 1, 11, 25);
  const ms = isToday ? 0 : Math.max(0, xmas - now);
  const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  $('cdK').textContent = isToday ? '今天就是圣诞节' : '距离圣诞节';
  $('cdD').textContent = pad(d); $('cdH').textContent = pad(h); $('cdM').textContent = pad(m); $('cdS').textContent = pad(s);
}

// ================= 场景 / 版本 / 画质 / 音乐 =================
let switching = false;
async function switchScene(id) {
  closePops();
  if (switching || (env && env.id === id)) return;
  switching = true;
  state.s = id; saveState(); renderLists();
  $('fade').classList.add('on');
  await new Promise((r) => setTimeout(r, 400));
  applyScene(id);
  $('fade').classList.remove('on');
  switching = false;
}
function setVersion(v) {
  closePops();
  if (state.v === v || !VERSIONS.includes(v)) return;
  state.v = v; saveState();
  tree.setTheme(v);
  document.body.dataset.v = v;
  renderLists(); renderGiftGrid(); renderPool(); rebuildCards();
  toast(`已切换到${VER_INFO[v].name}`);
}
function setBlind(on) {
  closePops();
  if (state.blind === on) return;
  closeCard(true);
  state.blind = on; saveState();
  applyGreeting(); renderPool();
  for (const c of cards) { c.face = on ? 'mystery' : 'own'; setFace(c, on ? mysteryTex : giftTex.get(c.gift.id)); }
  toast(on ? '盲盒模式：树上挂的都是盲盒，抽了才知道是什么' : '送礼模式：点相框就能拆礼物');
}
function setQuality(q) {
  state.quality = q; saveState();
  bloom.enabled = q !== 'low';
  tree.build(q);
  makeGlobalSnow();
  resize();
  if (env) { const id = env.id; scene.remove(env.group); disposeTree(env.group); env = null; applyScene(id); }
  renderLists();
}
function toggleMusic(force) {
  state.music = force ?? !state.music; saveState();
  audio.setMusic(state.music);
  $('btnMusic').classList.toggle('on', state.music);
  $('btnMusic').setAttribute('aria-pressed', state.music);
}

// ================= 弹出菜单 / 抽屉 =================
function closePops() { document.querySelectorAll('.pop.open').forEach((p) => p.classList.remove('open')); }
function togglePop(id) { const p = $(id), open = !p.classList.contains('open'); closePops(); if (open) p.classList.add('open'); }
function renderLists() {
  $('sceneList').innerHTML = SCENES.map((s, i) => `<button class="opt ${s.id === state.s ? 'on' : ''}" data-s="${s.id}"><i style="background:linear-gradient(135deg,${s.swatch[0]} 40%,${s.swatch[1]})"></i>${s.name}<span class="k">${i + 1}</span></button>`).join('');
  $('verList').innerHTML = VERSIONS.map((v) => `<button class="opt ${v === state.v ? 'on' : ''}" data-v="${v}"><i style="background:linear-gradient(135deg,${VER_INFO[v].sw[0]} 40%,${VER_INFO[v].sw[1]})"></i><span>${VER_INFO[v].name}<small>${VER_INFO[v].desc}</small></span></button>`).join('');
  $('verLabel').textContent = VER_INFO[state.v].name;
  document.querySelectorAll('#fVer button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.v));
  document.querySelectorAll('#fQ button').forEach((b) => b.classList.toggle('on', b.dataset.q === state.quality));
}
function renderGiftGrid() {
  const sel = state.gifts[state.v];
  $('giftGrid').innerHTML = PRESETS[state.v].map((g) => `<button class="gift ${sel.includes(g.id) ? 'on' : ''}" data-id="${g.id}" aria-pressed="${sel.includes(g.id)}">${g.tag ? `<span class="tg ${g.tag === '女宝' ? 'f' : ''}">${g.tag}</span>` : ''}<img src="${iconDataUri(g.id)}" alt=""><span>${escapeHTML(g.name)}</span></button>`).join('');
  $('giftCount').textContent = `${Math.min(sel.length + state.custom.length, MAX_GIFTS)}/${MAX_GIFTS}`;
  $('customList').innerHTML = state.custom.map((g) => `<div class="citem"><img src="${g.photo ? g.photo : iconDataUri(g.icon || 'giftbox')}" alt=""><div><b>${escapeHTML(g.name)}</b><small>${escapeHTML(g.line || '')}</small></div><button class="x" data-del="${g.id}" aria-label="删除">×</button></div>`).join('');
}
function renderPool() {
  const gifts = currentGifts();
  const total = gifts.reduce((a, g) => a + Math.max(0, state.counts[g.id] ?? 1), 0);
  $('poolList').innerHTML = gifts.map((g) => {
    const n = Math.max(0, state.counts[g.id] ?? 1);
    const pct = total ? Math.round((n / total) * 100) : 0;
    return `<div class="prow ${n ? '' : 'out'}"><img src="${g.photo ? g.photo : iconDataUri(g.icon || g.id)}" alt=""><span class="nm">${escapeHTML(g.name)}<br><span class="pc">${n ? `中奖率约 ${pct}%` : '已抽完'}</span></span><span class="step"><button data-dec="${g.id}" aria-label="减一份">−</button><b>${n}</b><button data-inc="${g.id}" aria-label="加一份">+</button></span></div>`;
  }).join('');
  $('chkDeplete').checked = state.deplete;
  $('histCount').textContent = state.history.length ? `共 ${state.history.length} 次` : '';
  $('histList').innerHTML = state.history.slice(0, 50).map((h) => { const d = new Date(h.t); return `<div><b>${escapeHTML(h.name)}</b><span>${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}</span></div>`; }).join('') || '<div>还没有抽过</div>';
  updateDrawBtn();
}
function toggleDrawer(open, focusPool) {
  const d = $('drawer');
  open = open ?? !d.classList.contains('open');
  closePops();
  d.classList.toggle('open', open); d.setAttribute('aria-hidden', !open);
  if (open) {
    $('fTo').value = state.to; $('fMsg').value = shownMsg(); $('fFrom').value = state.from; renderPool();
    if (focusPool && state.blind) setTimeout(() => $('blindSec').scrollIntoView({ behavior: 'smooth', block: 'start' }), 380);
  }
}

function bindUI() {
  document.body.dataset.v = state.v;
  renderLists(); renderGiftGrid(); renderPool(); applyGreeting(); tick(); setInterval(tick, 1000);
  $('btnMusic').classList.toggle('on', state.music);

  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-s]'); if (s) switchScene(s.dataset.s);
    const v = e.target.closest('button[data-v]'); if (v) setVersion(v.dataset.v);
    const q = e.target.closest('button[data-q]'); if (q) setQuality(q.dataset.q);
    const m = e.target.closest('button[data-mode]'); if (m) setBlind(m.dataset.mode === 'blind');
  });
  $('btnBlind').onclick = () => setBlind(!state.blind);
  $('camHide').onclick = () => setCamView(false);
  $('camShow').onclick = () => setCamView(true);
  $('btnDraw').onclick = () => drawNext();
  $('btnScene').onclick = () => togglePop('popScene');
  $('btnVer').onclick = () => togglePop('popVer');
  $('btnMix').onclick = () => { closeCard(); setMix(mixTarget ? 0 : 1); };
  $('btnHand').onclick = () => toggleGesture();
  $('gpill').onclick = () => toggleGesture();
  $('btnMusic').onclick = () => toggleMusic();
  $('btnFull').onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => toast('当前环境不支持全屏')); } catch (_) { toast('当前环境不支持全屏'); } };
  $('btnSettings').onclick = () => toggleDrawer();
  $('btnEdit').onclick = () => toggleDrawer(true, true);
  $('drawerClose').onclick = () => toggleDrawer(false);

  $('fTo').oninput = (e) => { state.to = e.target.value.trim().slice(0, 12); applyGreeting(); saveState(); };
  $('fMsg').oninput = (e) => { state.msg = e.target.value.slice(0, 60); applyGreeting(); saveState(); };
  $('fFrom').oninput = (e) => { state.from = e.target.value.trim().slice(0, 12); applyGreeting(); saveState(); };

  $('giftGrid').onclick = (e) => {
    const b = e.target.closest('.gift'); if (!b) return;
    const sel = state.gifts[state.v], i = sel.indexOf(b.dataset.id);
    if (i >= 0) { if (sel.length + state.custom.length <= 1) return toast('树上至少留一份礼物'); sel.splice(i, 1); }
    else { if (sel.length + state.custom.length >= MAX_GIFTS) return toast(`最多挂 ${MAX_GIFTS} 份礼物`); sel.push(b.dataset.id); }
    saveState(); renderGiftGrid(); renderPool(); rebuildCards();
  };
  let pendingPhoto = null;
  $('cFile').onchange = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    pendingPhoto = await shrinkImage(f, 560);
    $('cFileLabel').firstChild.textContent = pendingPhoto ? '已选' : '照片';
    $('cFileLabel').classList.toggle('on', !!pendingPhoto);
  };
  const addCustom = (g) => {
    if (state.gifts[state.v].length + state.custom.length >= MAX_GIFTS) { toast(`最多挂 ${MAX_GIFTS} 份，先取消几个预设`); return false; }
    state.custom.push(g); saveState(); renderGiftGrid(); renderPool(); rebuildCards(); return true;
  };
  $('cAdd').onclick = () => {
    const name = $('cName').value.trim();
    if (!name) return toast('先写上名称');
    if (!addCustom({ id: 'c' + Date.now().toString(36), name: name.slice(0, 14), line: $('cLine').value.trim().slice(0, 24), photo: pendingPhoto, icon: 'giftbox' })) return;
    $('cName').value = ''; $('cLine').value = ''; pendingPhoto = null; $('cFile').value = '';
    $('cFileLabel').firstChild.textContent = '照片'; $('cFileLabel').classList.remove('on');
    toast('已挂到树上');
  };
  $('customList').onclick = (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    state.custom = state.custom.filter((g) => g.id !== b.dataset.del);
    delete state.counts[b.dataset.del];
    saveState(); renderGiftGrid(); renderPool(); rebuildCards();
  };
  // 盲盒奖池
  $('btnThanks').onclick = () => {
    const id = 'thx' + Date.now().toString(36);
    if (addCustom({ id, name: '谢谢参与', line: '下次一定是你！', icon: 'thanks' })) { state.counts[id] = 5; saveState(); renderPool(); toast('已加入「谢谢参与」×5，份数越多越难中奖'); }
  };
  $('poolList').onclick = (e) => {
    const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
    const id = inc ? inc.dataset.inc : dec ? dec.dataset.dec : null;
    if (!id) return;
    state.counts[id] = clamp((state.counts[id] ?? 1) + (inc ? 1 : -1), 0, 999);
    saveState(); renderPool();
  };
  $('btnResetPool').onclick = () => {
    for (const g of currentGifts()) if (!isThanks(g)) state.counts[g.id] = 1;
    saveState(); renderPool(); toast('奖品份数已重置为每样 1 份');
  };
  $('chkDeplete').onchange = (e) => { state.deplete = e.target.checked; saveState(); updateDrawBtn(); };
  $('btnClearHist').onclick = () => { state.history = []; saveState(); renderPool(); };
  if (SINGLE) {
    $('shareBtn').textContent = '生成专属文件';
    $('shareNote').textContent = '会下载一个新的 html 文件，名字、祝福语、礼物、照片和盲盒奖池都已经放进去了。直接发给对方，双击就能打开。';
  }
  $('shareBtn').onclick = async () => {
    if (SINGLE) return exportPersonal();
    const q = new URLSearchParams({ to: state.to, msg: state.msg, v: state.v, s: state.s, g: state.gifts[state.v].join(',') });
    if (state.from) q.set('from', state.from);
    if (state.blind) q.set('m', 'blind');
    const url = location.href.split(/[?#]/)[0] + '?' + q.toString();
    const out = $('shareOut'); out.value = url; out.hidden = false;
    try { await navigator.clipboard.writeText(url); toast('链接已复制'); }
    catch (_) { out.select(); toast('复制被拦了，链接在下方，手动复制一下'); }
  };

  const start = (withHand) => {
    introOpen = false;
    $('intro').classList.add('gone');
    document.body.classList.add('live');
    audio.ensure();
    if (state.music) audio.setMusic(true);
    setTimeout(() => { setMix(0, false); audio.whoosh(false); }, 350);
    if (withHand) toggleGesture(true);
  };
  const ua = navigator.userAgent;
  const safariLocal = location.protocol === 'file:' && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Electron/.test(ua);
  let embedded = false;
  try { embedded = window.top !== window || !/^(file|https?):$/.test(location.protocol); } catch (_) { embedded = true; }
  if (embedded && location.protocol !== 'https:') $('introNote').innerHTML = '现在是在<b>预览窗口</b>里打开的，手势可能用不了。把这个文件下载到电脑上，用 Chrome 双击打开就能用手势。';
  if (safariLocal) $('introNote').innerHTML = 'Safari 打开本地文件时<b>不能用摄像头</b>。想用手势：右键这个文件 →「打开方式」→ 选 Google Chrome。用鼠标玩不受影响。';
  $('startHand').onclick = () => { if (safariLocal) { toast('Safari 不能用摄像头，请用 Chrome 打开这个文件'); return start(false); } start(true); };
  $('startMouse').onclick = () => start(false);
}

function exportPersonal() {
  const preset = {
    id: Math.random().toString(36).slice(2, 10), to: state.to, msg: state.msg, from: state.from, v: state.v, s: state.s, music: state.music,
    gifts: { [state.v]: state.gifts[state.v].slice() }, custom: state.custom, blind: state.blind, deplete: state.deplete, counts: state.counts,
  };
  // 只改 <head> 里的预设，避免碰到页面代码本身
  const S = 'scr' + 'ipt';
  const cut = PAGE_SRC.indexOf('</head>');
  let head = PAGE_SRC.slice(0, cut);
  head = head.replace(new RegExp('<' + S + ' id="gt-preset">[\\s\\S]*?</' + S + '>'), '').replace(/<html([^>]*?) class="[^"]*"/, '<html$1');
  head = head.replace('<head>', '<head><' + S + ' id="gt-preset">window.__GT_PRESET__=' + JSON.stringify(preset).replace(/</g, '\\u003c') + '</' + S + '>');
  const html = head + PAGE_SRC.slice(cut);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const nm = (state.to || 'TA').replace(/[\\/:*?"<>|]/g, '');
  a.download = state.blind ? `${nm}的圣诞盲盒.html` : `给${nm}的圣诞礼物树.html`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
  toast('已生成，在下载文件夹里，直接发出去就行');
}

function shrinkImage(file, max) {
  return new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const s = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      im.onerror = () => res(null);
      im.src = fr.result;
    };
    fr.onerror = () => res(null);
    fr.readAsDataURL(file);
  });
}

// ================= 启动 =================
bloom.enabled = state.quality !== 'low';
resize();
applyScene(state.s);
bindUI();
rebuildCards();
requestAnimationFrame(frame);
window.__GT_READY__ = true;
window.__app = {
  setMix, openCard: (i) => openCard(cards[i]), closeCard: () => closeCard(true), switchScene, setVersion, setQuality, toggleDrawer, togglePop, setBlind, setCamView,
  draw: () => drawNext(), get cards() { return cards; }, get phase() { return draw && draw.phase; }, get state() { return state; },
};
