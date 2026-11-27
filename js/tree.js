// 装饰圣诞树：针叶粒子 + 树体 + 灯串螺旋 + 小彩灯 + 金属彩球 + 金色星星挂件 + 树下礼盒堆 + 顶星
// 散开时：针叶变成雪尘星河，彩球/礼盒/星星一起飞散翻滚，灯串保留成发光的螺旋圈
import * as THREE from 'three';
import { rng, glowSprite, canvasTex, glowTexture } from './util.js';

export const TREE = { baseY: 0.6, height: 9.6, baseR: 4.2, tiers: 6 };
export const TOP_Y = TREE.baseY + TREE.height;

export function treeRadius(t) {
  const f = (t * TREE.tiers) % 1;
  return TREE.baseR * Math.pow(1 - t, 1.05) * (0.72 + 0.28 * (1 - f));
}

const PAL = {
  boy: {
    bulbs: ['#ffd36b', '#ff5a5a', '#7cc8ff', '#ffffff', '#ffe9b0'],
    baubles: ['#d9a53a', '#c41e2e', '#d9dee8', '#2453c4', '#d9a53a', '#b01b28'],
    boxes: ['#c41e2e', '#16345e', '#1f6b4a', '#d9a53a', '#c9d0dc', '#2a62c9'],
    ribbon: '#f2cf72', metal: 0.85,
  },
  girl: {
    bulbs: ['#ffd9a0', '#ff8fb1', '#ffffff', '#ffc2d6', '#ffe9c8'],
    baubles: ['#e8b4a0', '#e85a8a', '#f3dcc0', '#c41e45', '#ffffff', '#d9a53a'],
    boxes: ['#e0708f', '#c41e3a', '#d9c6b6', '#8a2448', '#d49c86', '#e2d8d0'],
    ribbon: '#f6d9a8', metal: 0.8,
  },
  baby: {
    bulbs: ['#fff2b8', '#b8f0da', '#bfe0ff', '#ffd0df', '#ffffff'],
    baubles: ['#ffc2d6', '#a8e6cf', '#a8d4ff', '#ffe08a', '#f4f1ea', '#e8cf98'],
    boxes: ['#7fc9ad', '#e8c25a', '#7fb4e6', '#e89ab4', '#d8d2c8', '#d9b48a'],
    ribbon: '#f4efe6', metal: 0.45,
  },
};

// ---------- 共享着色器 ----------
const VERT = /* glsl */ `
uniform float uTime, uMix, uSize, uPR, uSpin, uRing;
attribute vec3 aScatter; attribute vec3 aColor; attribute float aSize; attribute float aSeed; attribute float aTw;
varying vec3 vColor; varying float vTw; varying float vM;
void main(){
  float delay = aSeed * 0.42;
  float m = smoothstep(delay, delay + 0.58, uMix);
  vec3 tp = position;
  tp.x += sin(uTime*1.3 + aSeed*40.0) * 0.012;
  tp.z += cos(uTime*1.1 + aSeed*30.0) * 0.012;
  float ang = uTime * mix(0.04 + 0.1 * (1.0 - aSeed), uSpin, uRing);
  float ca = cos(ang), sa = sin(ang);
  vec3 sp = vec3(aScatter.x*ca - aScatter.z*sa, aScatter.y + sin(uTime*0.5 + aSeed*20.0)*0.25*(1.0-uRing), aScatter.x*sa + aScatter.z*ca);
  sp.y -= sp.z * 0.3 * (1.0 - uRing);
  vec3 p = mix(tp, sp, m);
  float arc = sin(m * 3.14159);
  vec3 dir = normalize(vec3(sp.x, 0.0, sp.z) + vec3(0.0001));
  p += dir * arc * (0.8 + aSeed * 2.4) * (1.0 - uRing * 0.7);
  p.y += arc * (aSeed - 0.35) * 2.2 * (1.0 - uRing);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float tw = 1.0 + aTw * 0.7 * sin(uTime * (1.6 + aSeed * 3.5) + aSeed * 60.0);
  gl_PointSize = aSize * uSize * uPR * tw * mix(1.0, 0.58, m * (1.0 - uRing)) * (60.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
  vColor = aColor; vTw = tw; vM = m;
}`;
const FRAG_SOLID = /* glsl */ `
varying vec3 vColor; varying float vTw; varying float vM;
uniform vec3 uFrost;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  if (d > 0.5) discard;
  vec3 col = mix(vColor, uFrost, vM * 0.85);
  col *= 0.7 + 0.4 * smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(col, 1.0);
}`;
const FRAG_GLOW = /* glsl */ `
varying vec3 vColor; varying float vTw; varying float vM;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c);
  if (d > 0.5) discard;
  float a = pow(smoothstep(0.5, 0.0, d), 1.8);
  gl_FragColor = vec4(vColor * a * (0.7 + 0.5 * vTw), a);
}`;

function galaxyPoint(theta0, r, spread = 1) {
  const radius = 3.0 + Math.pow(r(), 0.8) * 13.5 * spread;
  const theta = theta0 + radius * 0.36 + (r() - 0.5) * 0.8;
  const y = 5.6 + (r() - 0.5) * (2.0 + radius * 0.34) + Math.sin(theta * 2.0) * 0.5;
  return [Math.cos(theta) * radius, y, Math.sin(theta) * radius];
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class DecoratedTree {
  constructor({ quality, theme, envMap }) {
    this.group = new THREE.Group();
    this.envMap = envMap;
    this.theme = theme;
    this.uniforms = {
      uTime: { value: 0 }, uMix: { value: 0 }, uSize: { value: 2.0 }, uPR: { value: Math.min(devicePixelRatio, 2) },
      uFrost: { value: new THREE.Color('#c9dcff') }, uSpin: { value: 0 }, uRing: { value: 0 },
    };
    this.ringUniforms = { ...this.uniforms, uSpin: { value: 0.12 }, uRing: { value: 1 } };
    this.buildBody();
    this.buildStar();
    this.buildBaseGlow();
    this.build(quality);
  }

  build(quality) {
    for (const o of [this.needles, this.garland, this.bulbs, this.baubles, this.stars, this.boxes, this.ribbons]) if (o) { this.group.remove(o); o.geometry.dispose(); }
    const q = { high: 1, medium: 0.62, low: 0.38 }[quality] || 0.62;
    this.needles = this.makeNeedles(Math.round(19000 * q));
    this.garland = this.makeGarland(Math.round(2600 * Math.max(q, 0.5)));
    this.bulbs = this.makeBulbs(Math.round(1500 * q));
    this.makeOrnaments(Math.round(130 * Math.max(q, 0.55)), Math.round(34 * Math.max(q, 0.6)), Math.round(64 * Math.max(q, 0.55)));
    this.group.add(this.needles, this.garland, this.bulbs);
    this.setTheme(this.theme);
  }

  points(n, fill, glow, uniforms) {
    const pos = new Float32Array(n * 3), sc = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const size = new Float32Array(n), seed = new Float32Array(n), tw = new Float32Array(n);
    for (let i = 0; i < n; i++) fill(i, pos, sc, col, size, seed, tw);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aScatter', new THREE.BufferAttribute(sc, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aTw', new THREE.BufferAttribute(tw, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: uniforms || this.uniforms, vertexShader: VERT, fragmentShader: glow ? FRAG_GLOW : FRAG_SOLID,
      transparent: glow, depthWrite: !glow, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    if (glow) p.renderOrder = 2;
    return p;
  }

  makeNeedles(n) {
    const r = rng(11);
    const greens = ['#08331f', '#0c4128', '#115232', '#18633d', '#227449', '#2f8656'].map((h) => new THREE.Color(h));
    const frost = new THREE.Color('#e6f1ff'), c = new THREE.Color();
    return this.points(n, (i, pos, sc, col, size, seed, tw) => {
      const t = 1 - Math.sqrt(r()) * 0.995;
      const R = treeRadius(t);
      const rad = R * Math.pow(r(), 0.28);
      const a = r() * Math.PI * 2;
      const outer = R > 0 ? rad / R : 0;
      pos.set([Math.cos(a) * rad, TREE.baseY + t * TREE.height - outer * 0.3 * (1 - t), Math.sin(a) * rad], i * 3);
      sc.set(galaxyPoint(a, r), i * 3);
      c.copy(greens[Math.floor(r() * greens.length)]).multiplyScalar(0.6 + 0.65 * outer + 0.2 * t);
      if (r() < 0.06 * outer) c.lerp(frost, 0.7);
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = 0.45 + r() * 0.6; seed[i] = r(); tw[i] = 0;
    }, false);
  }

  // 灯串：两股螺旋，散开后仍是一圈圈发光螺旋
  makeGarland(n) {
    const r = rng(23), warm = new THREE.Color('#fff1d0');
    return this.points(n, (i, pos, sc, col, size, seed, tw) => {
      const strand = i % 2, u = i / n;
      const t = 0.03 + u * 0.93;
      const a = t * Math.PI * 2 * 5.5 + strand * Math.PI;
      const R = treeRadius(t) * 0.97 + 0.1;
      const y = TREE.baseY + t * TREE.height - 0.2 * (1 - t);
      const p = [Math.cos(a) * R, y, Math.sin(a) * R];
      pos.set(p, i * 3);
      const k = 1.75 + (1 - t) * 0.4;
      sc.set([p[0] * k, y * 1.08 + 0.3, p[2] * k], i * 3);
      const cc = warm.clone().multiplyScalar(0.6 + r() * 0.35);
      col.set([cc.r, cc.g, cc.b], i * 3);
      size[i] = 1.0 + r() * 0.7; seed[i] = 0.25 + u * 0.1; tw[i] = 0.25;
    }, true, this.ringUniforms);
  }

  makeBulbs(n) {
    const r = rng(31);
    this._bulbCol = null;
    const pts = this.points(n, (i, pos, sc, col, size, seed, tw) => {
      const t = 0.04 + Math.pow(r(), 0.85) * 0.9;
      const R = treeRadius(t) * (0.88 + r() * 0.16);
      const a = r() * Math.PI * 2;
      pos.set([Math.cos(a) * R, TREE.baseY + t * TREE.height - 0.22 * (1 - t), Math.sin(a) * R], i * 3);
      sc.set(galaxyPoint(a, r, 1.05), i * 3);
      col.set([1, 1, 1], i * 3);
      size[i] = 0.9 + r() * 1.2; seed[i] = r(); tw[i] = 0.9;
    }, true);
    this._bulbCol = pts.geometry.attributes.aColor;
    return pts;
  }

  // 彩球 / 星星挂件 / 礼盒：实例化网格，CPU 每帧插值
  makeOrnaments(nBaubles, nStars, nBoxes) {
    const r = rng(47);
    const metalMat = (opts) => new THREE.MeshStandardMaterial({ envMap: this.envMap, envMapIntensity: 0.85, ...opts });
    // 彩球
    const bGeo = new THREE.SphereGeometry(1, 20, 14);
    this.baubles = new THREE.InstancedMesh(bGeo, metalMat({ metalness: 0.85, roughness: 0.16 }), nBaubles);
    this.baubleData = [];
    for (let i = 0; i < nBaubles; i++) {
      const t = 0.06 + Math.pow(r(), 0.8) * 0.82;
      const R = treeRadius(t) * (0.9 + r() * 0.1) + 0.08;
      const a = r() * Math.PI * 2;
      this.baubleData.push({
        tree: new THREE.Vector3(Math.cos(a) * R, TREE.baseY + t * TREE.height - 0.3 * (1 - t), Math.sin(a) * R),
        scatter: new THREE.Vector3(...galaxyPoint(a, r, 0.95)), s: 0.13 + r() * 0.13 * (1.2 - t), seed: r(), spin: (r() - 0.5) * 2,
      });
    }
    // 金色小星星
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? 0.42 : 1;
      i ? shape.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr) : shape.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    const sGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 });
    sGeo.center();
    this.stars = new THREE.InstancedMesh(sGeo, metalMat({ color: '#f1c75a', metalness: 1, roughness: 0.25, emissive: '#5a3a08', emissiveIntensity: 0.6 }), nStars);
    this.starData = [];
    for (let i = 0; i < nStars; i++) {
      const t = 0.1 + r() * 0.78, R = treeRadius(t) + 0.12, a = r() * Math.PI * 2;
      this.starData.push({
        tree: new THREE.Vector3(Math.cos(a) * R, TREE.baseY + t * TREE.height - 0.2, Math.sin(a) * R),
        scatter: new THREE.Vector3(...galaxyPoint(a, r, 1.0)), s: 0.14 + r() * 0.08, seed: r(), spin: (r() - 0.5) * 3, face: a,
      });
    }
    // 礼盒：树下堆成一圈，散开时飞上天
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.boxes = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05, envMap: this.envMap, envMapIntensity: 0.25 }), nBoxes);
    const ribGeo = (() => {
      const a = new THREE.BoxGeometry(1.02, 1.02, 0.2), b = new THREE.BoxGeometry(0.2, 1.02, 1.02);
      const merged = new THREE.BufferGeometry();
      const pa = [...a.toNonIndexed().attributes.position.array, ...b.toNonIndexed().attributes.position.array];
      const na = [...a.toNonIndexed().attributes.normal.array, ...b.toNonIndexed().attributes.normal.array];
      merged.setAttribute('position', new THREE.Float32BufferAttribute(pa, 3));
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(na, 3));
      return merged;
    })();
    this.ribbonMat = new THREE.MeshStandardMaterial({ color: '#f2cf72', metalness: 0.7, roughness: 0.35, envMap: this.envMap, envMapIntensity: 0.5 });
    this.ribbons = new THREE.InstancedMesh(ribGeo, this.ribbonMat, nBoxes);
    this.boxData = [];
    for (let i = 0; i < nBoxes; i++) {
      const ring = i < nBoxes * 0.7;
      const a = r() * Math.PI * 2, d = ring ? 3.4 + Math.pow(r(), 0.8) * 2.8 : 2.2 + r() * 1.4;
      const s = ring ? 0.4 + r() * 0.48 : 0.3 + r() * 0.25;
      const stackY = r() < 0.18 ? s * 1.05 : 0;
      this.boxData.push({
        tree: new THREE.Vector3(Math.cos(a) * d, s / 2 + stackY, Math.sin(a) * d * 0.95),
        scatter: new THREE.Vector3(...galaxyPoint(a, r, 0.9)), s: new THREE.Vector3(s * (0.9 + r() * 0.3), s * (0.75 + r() * 0.4), s * (0.9 + r() * 0.3)),
        seed: r(), spin: (r() - 0.5) * 2.4, yaw: r() * Math.PI,
      });
    }
    for (const m of [this.baubles, this.stars, this.boxes, this.ribbons]) { m.frustumCulled = false; this.group.add(m); }
  }

  buildBody() {
    // 深色树体，填住粒子间的缝隙，让树看起来更实
    const mat = new THREE.MeshStandardMaterial({ color: '#0a2a1c', roughness: 0.95, transparent: true });
    this.body = new THREE.Group();
    for (let i = 0; i < TREE.tiers; i++) {
      const t0 = i / TREE.tiers, t1 = (i + 1) / TREE.tiers;
      const rBottom = treeRadius(t0 + 0.0001) * 0.74, h = (t1 - t0) * TREE.height * 1.35;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rBottom, h, 18, 1, true), mat);
      cone.position.y = TREE.baseY + t0 * TREE.height + h / 2 - 0.15;
      this.body.add(cone);
    }
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 1.2, 10), new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.9 }));
    trunk.position.y = 0.45;
    this.body.add(trunk);
    this.bodyMat = mat;
    this.group.add(this.body);
  }

  buildStar() {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? 0.3 : 0.74;
      i ? shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.07, bevelSegments: 3 });
    geo.center();
    this.star = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffd77a', emissive: '#ffae2a', emissiveIntensity: 1.1, metalness: 0.8, roughness: 0.3, envMap: this.envMap, envMapIntensity: 0.5 }));
    const flareTex = canvasTex(256, 256, (g, w) => {
      const c = w / 2;
      const rad = g.createRadialGradient(c, c, 0, c, c, c);
      rad.addColorStop(0, 'rgba(255,255,255,1)'); rad.addColorStop(0.08, 'rgba(255,240,200,0.8)'); rad.addColorStop(0.35, 'rgba(255,200,120,0.12)'); rad.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = rad; g.fillRect(0, 0, w, w);
      g.globalCompositeOperation = 'lighter';
      for (const [ang, len, wid] of [[0, 1, 5], [Math.PI / 2, 1, 5], [Math.PI / 4, 0.55, 3], [-Math.PI / 4, 0.55, 3]]) {
        g.save(); g.translate(c, c); g.rotate(ang);
        const lgr = g.createLinearGradient(-c * len, 0, c * len, 0);
        lgr.addColorStop(0, 'rgba(255,230,180,0)'); lgr.addColorStop(0.5, 'rgba(255,245,220,0.95)'); lgr.addColorStop(1, 'rgba(255,230,180,0)');
        g.fillStyle = lgr; g.fillRect(-c * len, -wid / 2, c * len * 2, wid); g.restore();
      }
    });
    this.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, color: '#ffe6b0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.flare.scale.setScalar(3.6);
    this.starGlow = glowSprite('#ffcf7a', 3.2, 0.4);
    this.group.add(this.star, this.starGlow, this.flare);
  }

  buildBaseGlow() {
    const tex = canvasTex(256, 256, (g, w) => {
      const c = w / 2, gr = g.createRadialGradient(c, c, 0, c, c, c);
      gr.addColorStop(0, 'rgba(255,214,140,0.95)'); gr.addColorStop(0.35, 'rgba(255,190,110,0.45)'); gr.addColorStop(0.7, 'rgba(255,170,90,0.1)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    this.baseGlow = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.62, 0.58, 0.52) }));
    this.baseGlow.rotation.x = -Math.PI / 2; this.baseGlow.position.y = 0.04; this.baseGlow.renderOrder = 1;
    this.group.add(this.baseGlow);
  }

  setTheme(theme) {
    this.theme = theme;
    const p = PAL[theme], c = new THREE.Color(), r = rng(5);
    if (this._bulbCol) {
      const pal = p.bulbs.map((h) => new THREE.Color(h).multiplyScalar(1.0));
      for (let i = 0; i < this._bulbCol.count; i++) { const k = pal[Math.floor(r() * pal.length)]; this._bulbCol.setXYZ(i, k.r, k.g, k.b); }
      this._bulbCol.needsUpdate = true;
    }
    if (this.baubles) {
      this.baubles.material.metalness = p.metal; this.baubles.material.roughness = theme === 'baby' ? 0.32 : 0.16;
      for (let i = 0; i < this.baubles.count; i++) this.baubles.setColorAt(i, c.set(p.baubles[i % p.baubles.length]));
      this.baubles.instanceColor.needsUpdate = true;
      for (let i = 0; i < this.boxes.count; i++) this.boxes.setColorAt(i, c.set(p.boxes[Math.floor(r() * p.boxes.length)]));
      this.boxes.instanceColor.needsUpdate = true;
      this.ribbonMat.color.set(p.ribbon);
    }
  }

  update(time, mix, dt) {
    const u = this.uniforms;
    u.uTime.value = time; u.uMix.value = mix;
    const em = mix * mix * (3 - 2 * mix);
    // 树体与灯光
    this.body.visible = mix < 0.98;
    this.bodyMat.opacity = 1 - smooth(0.05, 0.5, mix);
    this.body.scale.setScalar(1 - em * 0.4);
    this.baseGlow.material.opacity = 1 - em * 0.55;
    const pulse = 1 + Math.sin(time * 2.2) * 0.06;
    const sy = TOP_Y + 0.4 + em * 1.4;
    this.star.position.set(0, sy, 0); this.star.rotation.y = time * (0.6 + mix * 1.8); this.star.scale.setScalar(pulse * (1 + em * 0.3));
    this.starGlow.position.set(0, sy, 0); this.flare.position.set(0, sy, 0.15);
    this.flare.material.rotation = time * 0.15; this.flare.scale.setScalar(3.6 * pulse * (1 + em * 0.3));
    // 实例化挂件
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sp = new THREE.Vector3(), s3 = new THREE.Vector3();
    const place = (d, i) => {
      const delay = d.seed * 0.42, m = smooth(delay, delay + 0.58, mix);
      const ang = time * (0.04 + 0.1 * (1 - d.seed));
      const ca = Math.cos(ang), sa = Math.sin(ang);
      sp.set(d.scatter.x * ca - d.scatter.z * sa, d.scatter.y + Math.sin(time * 0.5 + d.seed * 20) * 0.3, d.scatter.x * sa + d.scatter.z * ca);
      sp.y -= sp.z * 0.3;
      p.lerpVectors(d.tree, sp, m);
      const arc = Math.sin(m * Math.PI);
      const len = Math.hypot(sp.x, sp.z) || 1;
      p.x += (sp.x / len) * arc * (0.8 + d.seed * 2.4); p.z += (sp.z / len) * arc * (0.8 + d.seed * 2.4); p.y += arc * (d.seed - 0.35) * 2.2;
      return m;
    };
    this.baubleData.forEach((d, i) => {
      const m = place(d, i);
      q.identity(); s3.setScalar(d.s * (1 + m * 0.35));
      this.baubles.setMatrixAt(i, m4.compose(p, q, s3));
    });
    this.starData.forEach((d, i) => {
      const m = place(d, i);
      e.set(m * time * d.spin, d.face + time * 0.4 * (0.3 + m), m * time * d.spin * 0.6); q.setFromEuler(e);
      s3.setScalar(d.s * (1 + m * 0.6));
      this.stars.setMatrixAt(i, m4.compose(p, q, s3));
    });
    this.boxData.forEach((d, i) => {
      const m = place(d, i);
      e.set(m * time * d.spin, d.yaw + m * time * d.spin * 0.7, m * time * d.spin * 0.4); q.setFromEuler(e);
      s3.copy(d.s).multiplyScalar(1 - m * 0.25);
      m4.compose(p, q, s3);
      this.boxes.setMatrixAt(i, m4); this.ribbons.setMatrixAt(i, m4);
    });
    for (const im of [this.baubles, this.stars, this.boxes, this.ribbons]) im.instanceMatrix.needsUpdate = true;
  }
}
