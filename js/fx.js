// 天空、落雪、地面闪光、炉火、炊烟、流星
import * as THREE from 'three';
import { rng, canvasTex } from './util.js';

const PR = () => Math.min(window.devicePixelRatio, 2);

export function makeSky({ top, mid, horizon, glow = '#000000', glowStrength = 0, band = '#5f7fc0', bandStrength = 0.5 }) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(top) }, uMid: { value: new THREE.Color(mid) },
      uHor: { value: new THREE.Color(horizon) }, uGlow: { value: new THREE.Color(glow) }, uGS: { value: glowStrength },
      uBand: { value: new THREE.Color(band) }, uBS: { value: bandStrength },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uTop,uMid,uHor,uGlow,uBand; uniform float uGS,uBS; varying vec3 vP;
      float hash(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
      void main(){ float h = vP.y;
        vec3 c = mix(uHor, uMid, smoothstep(-0.02, 0.22, h));
        c = mix(c, uTop, smoothstep(0.22, 0.75, h));
        c += uGlow * uGS * exp(-abs(h - 0.02) * 14.0);
        // 银河带
        vec3 n = normalize(vec3(0.42, 0.9, -0.5));
        float d = dot(vP, n);
        float band = exp(-d*d*22.0) * smoothstep(-0.02, 0.3, h);
        float cl = fbm(vP*5.0), du = fbm(vP*13.0 + 3.1);
        vec3 bc = uBand * band * (0.25 + 1.1*cl*cl) * uBS;
        bc *= 1.0 - 0.75 * smoothstep(0.5, 0.72, du) * band;
        bc += vec3(1.0,0.85,0.7) * pow(band,6.0) * cl * 0.12 * uBS;
        c += bc;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(420, 48, 24), mat);
  m.renderOrder = -10;
  return m;
}

export function makeStars(count = 1600, seed = 3) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), s = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const th = r() * Math.PI * 2, ph = Math.acos(1 - r() * 0.92);
    const R = 380;
    pos.set([Math.sin(ph) * Math.cos(th) * R, Math.cos(ph) * R, Math.sin(ph) * Math.sin(th) * R], i * 3);
    s[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: PR() } },
    vertexShader: `attribute float aSeed; uniform float uTime,uPR; varying float vA;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv;
        float tw = 0.55 + 0.45*sin(uTime*(0.6+aSeed*2.0) + aSeed*90.0);
        gl_PointSize = (1.0 + aSeed*aSeed*2.6) * uPR; vA = tw * (0.35 + aSeed*0.65) * smoothstep(-5.0, 60.0, position.y); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; float a = smoothstep(.5,0.,d)*vA; gl_FragColor = vec4(vec3(0.85,0.9,1.0)*a, a); }`,
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  p.userData.update = (t) => (mat.uniforms.uTime.value = t);
  return p;
}

export function makeMoon(x, y, z, size = 26, tint = '#f4f1e4') {
  const tex = canvasTex(256, 256, (g, w) => {
    const c = w / 2;
    const halo = g.createRadialGradient(c, c, 0, c, c, c);
    halo.addColorStop(0, 'rgba(255,250,235,1)'); halo.addColorStop(0.22, 'rgba(255,250,235,1)');
    halo.addColorStop(0.24, 'rgba(220,235,255,0.35)'); halo.addColorStop(0.5, 'rgba(160,190,240,0.1)'); halo.addColorStop(1, 'rgba(120,150,220,0)');
    g.fillStyle = halo; g.fillRect(0, 0, w, w);
    g.fillStyle = 'rgba(200,200,190,0.35)';
    for (const [dx, dy, rr] of [[-10, -8, 9], [12, 6, 7], [-4, 14, 5], [8, -14, 4]]) { g.beginPath(); g.arc(c + dx, c + dy, rr, 0, 7); g.fill(); }
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: tint, fog: false, depthWrite: false, transparent: true }));
  s.position.set(x, y, z); s.scale.setScalar(size);
  s.renderOrder = -9;
  return s;
}

// 落雪 / 室内浮尘
export function makeSnow(count, { color = '#ffffff', fall = 1, size = 3.2, area = [70, 34, 60], center = [0, 0, -5], alpha = 1 } = {}) {
  const r = rng(77);
  const pos = new Float32Array(count * 3), seed = new Float32Array(count), sp = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([(r() - 0.5) * area[0] + center[0], r() * area[1] + center[1], (r() - 0.5) * area[2] + center[2]], i * 3);
    seed[i] = r(); sp[i] = 0.8 + r() * 1.6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aSpeed', new THREE.BufferAttribute(sp, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uFall: { value: fall }, uH: { value: area[1] }, uY0: { value: center[1] }, uSize: { value: size }, uPR: { value: PR() }, uColor: { value: new THREE.Color(color).multiplyScalar(alpha) }, uWind: { value: 0 } },
    vertexShader: `attribute float aSeed, aSpeed; uniform float uTime,uFall,uH,uY0,uSize,uPR,uWind; varying float vA;
      void main(){ vec3 p = position; float yy = mod(p.y - uY0 - uTime*aSpeed*uFall, uH); p.y = yy + uY0;
        p.x += sin(uTime*0.5 + aSeed*12.0)*0.9 + uWind*(uH - yy)*0.15; p.z += cos(uTime*0.4 + aSeed*9.0)*0.7;
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = uSize*uPR*(0.5+aSeed*0.9)*(40.0/-mv.z);
        vA = smoothstep(0.0, 1.5, yy)*smoothstep(uH, uH-3.0, yy)*(0.45+0.55*aSeed); }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; float a = pow(smoothstep(.5,0.,d),1.5)*vA; gl_FragColor = vec4(uColor*a, a); }`,
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  p.userData.update = (t) => (mat.uniforms.uTime.value = t);
  p.userData.mat = mat;
  return p;
}

// 雪地反光的细碎闪点
export function makeGlints(count, heightFn, radius = 60, seed = 9) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), s = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, d = 3 + Math.sqrt(r()) * radius;
    const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.9 - 6;
    pos.set([x, heightFn(x, z) + 0.04, z], i * 3); s[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: PR() } },
    vertexShader: `attribute float aSeed; uniform float uTime,uPR; varying float vA;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv;
        float t = sin(uTime*(0.8+aSeed*1.7) + aSeed*100.0); vA = pow(max(t,0.0), 10.0);
        gl_PointSize = (2.0 + aSeed*3.0)*uPR*(30.0/-mv.z)*(0.6+vA); }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord-.5; float d = length(c); float x = max(0.0, 1.0-abs(c.x)*14.0)*max(0.0,1.0-abs(c.y)*2.2) + max(0.0, 1.0-abs(c.y)*14.0)*max(0.0,1.0-abs(c.x)*2.2);
      float a = (smoothstep(.5,0.,d)*0.6 + x)*vA; gl_FragColor = vec4(vec3(0.9,0.96,1.0)*a, a); }`,
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  p.userData.update = (t) => (mat.uniforms.uTime.value = t);
  return p;
}

// 雪地荧光：一簇一簇贴在雪面上的冷光点，慢慢呼吸明暗；每簇下面的雪被照出一圈淡光
export function makeSnowGlow(clusters, heightFn, seed = 17) {
  const r = rng(seed);
  const PAL = [[0.37, 0.96, 1.0], [0.49, 1.0, 0.77], [0.56, 0.78, 1.0], [0.71, 0.55, 1.0], [0.37, 0.96, 1.0], [0.49, 1.0, 0.77]];
  const P = [], C = [], S = [];                       // 光点
  const GP = [], GU = [], GC = [], GS = [], GI = [];  // 贴地光晕（跟着雪坡起伏，不会被地面切掉）
  const N = 6;
  for (let k = 0; k < clusters; k++) {
    const a = r() * Math.PI * 2, d = 11 + Math.pow(r(), 1.3) * 40;
    const cx = Math.cos(a) * d * 1.15, cz = Math.sin(a) * d * 0.75 - 6;
    if (cz > 12 || (cz > 2 && Math.abs(cx) < 12)) continue;   // 镜头前面留空，不挡树
    const col = PAL[Math.floor(r() * PAL.length)];
    const sd = r();
    const n = 4 + Math.floor(r() * 7);
    for (let i = 0; i < n; i++) {
      const x = cx + (r() - 0.5) * 3.2, z = cz + (r() - 0.5) * 3.2;
      P.push(x, heightFn(x, z) + 0.22, z); C.push(...col); S.push(r());
    }
    const R = 2.4 + r() * 1.8, base = GP.length / 3;
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const u = (i / N) * 2 - 1, v = (j / N) * 2 - 1, x = cx + u * R, z = cz + v * R;
      GP.push(x, heightFn(x, z) + 0.08, z); GU.push(u, v); GC.push(...col); GS.push(sd);
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const q = base + j * (N + 1) + i;
      GI.push(q, q + N + 1, q + 1, q + 1, q + N + 1, q + N + 2);
    }
  }
  const group = new THREE.Group();
  const uTime = { value: 0 };

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(S, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { uTime, uPR: { value: PR() } },
    vertexShader: `attribute float aSeed; uniform float uTime,uPR; varying float vA; varying vec3 vC;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv;
        float br = 0.55 + 0.45*sin(uTime*(0.6+aSeed*0.9) + aSeed*40.0);
        vA = br; vC = color;
        gl_PointSize = min((6.0 + aSeed*7.0)*uPR*(30.0/-mv.z)*(0.75+0.35*br), 48.0); }`,
    fragmentShader: `varying float vA; varying vec3 vC;
      void main(){ float d = length(gl_PointCoord-.5);
        float core = smoothstep(.5,.0,d); core = core*core*0.9 + smoothstep(.14,.0,d)*1.4;
        float a = core*vA; gl_FragColor = vec4(vC*a, a); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  group.add(pts);

  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(GP, 3));
  gg.setAttribute('aUV', new THREE.Float32BufferAttribute(GU, 2));
  gg.setAttribute('color', new THREE.Float32BufferAttribute(GC, 3));
  gg.setAttribute('aSeed', new THREE.Float32BufferAttribute(GS, 1));
  gg.setIndex(GI);
  const gmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { uTime },
    vertexShader: `attribute vec2 aUV; attribute float aSeed; uniform float uTime; varying vec2 vUV; varying vec3 vC; varying float vA;
      void main(){ vUV = aUV; vC = color; vA = 0.6 + 0.4*sin(uTime*(0.5+aSeed*0.8) + aSeed*40.0);
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUV; varying vec3 vC; varying float vA;
      void main(){ float d = length(vUV); float a = pow(max(0.0, 1.0 - d), 1.8)*0.62*vA; gl_FragColor = vec4(vC*a, a); }`,
  });
  const pools = new THREE.Mesh(gg, gmat);
  pools.frustumCulled = false;
  group.add(pools);

  group.userData.update = (t) => (uTime.value = t);
  return group;
}

// 炉火粒子
export function makeFire(count = 140) {
  const r = rng(4);
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos.set([(r() - 0.5) * 2.2, 0, (r() - 0.5) * 0.6], i * 3); seed[i] = r(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: PR() } },
    vertexShader: `attribute float aSeed; uniform float uTime,uPR; varying float vL;
      void main(){ float life = fract(uTime*(0.55+aSeed*0.6) + aSeed*7.0); vL = life;
        vec3 p = position; p.x *= (1.0 - life*0.8); p.y += life*2.2; p.x += sin(uTime*6.0+aSeed*40.0)*0.08*life;
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = (26.0*(1.0-life*0.7))*uPR*(20.0/-mv.z); }`,
    fragmentShader: `varying float vL; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard;
      vec3 c = mix(vec3(1.0,0.85,0.45), vec3(1.0,0.25,0.05), vL); float a = smoothstep(.5,0.,d)*(1.0-vL)*0.55;
      gl_FragColor = vec4(c*a*1.6, a); }`,
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  p.userData.update = (t) => (mat.uniforms.uTime.value = t);
  return p;
}

// 烟囱炊烟
export function makeSmoke(count = 46) {
  const r = rng(8);
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos.set([0, 0, 0], i * 3); seed[i] = r(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: PR() } },
    vertexShader: `attribute float aSeed; uniform float uTime,uPR; varying float vL;
      void main(){ float life = fract(uTime*0.07 + aSeed); vL = life;
        vec3 p = vec3(life*life*6.0 + sin(life*6.0+aSeed*9.0)*0.6, life*9.0, sin(aSeed*20.0)*0.5*life);
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = (40.0 + life*140.0)*uPR*(10.0/-mv.z); }`,
    fragmentShader: `varying float vL; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard;
      float a = smoothstep(.5,0.,d)*smoothstep(0.0,0.12,vL)*(1.0-vL)*0.18; gl_FragColor = vec4(vec3(0.62,0.68,0.78), a); }`,
  });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  p.userData.update = (t) => (mat.uniforms.uTime.value = t);
  return p;
}

// 偶尔划过的流星
export function makeShootingStar() {
  const tex = canvasTex(256, 8, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.85, 'rgba(210,230,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.visible = false;
  let next = 4, start = 0, from = new THREE.Vector3(), dir = new THREE.Vector3();
  m.userData.update = (t) => {
    if (!m.visible && t > next) {
      m.visible = true; start = t;
      from.set(-60 + Math.random() * 140, 90 + Math.random() * 50, -300);
      const ang = -0.35 - Math.random() * 0.35;
      dir.set(Math.cos(ang) * (Math.random() < 0.5 ? -1 : 1), Math.sin(ang), 0);
      m.rotation.z = Math.atan2(dir.y, dir.x);
    }
    if (m.visible) {
      const k = (t - start) / 1.1;
      if (k >= 1) { m.visible = false; next = t + 5 + Math.random() * 8; return; }
      m.position.copy(from).addScaledVector(dir, k * 120);
      m.material.opacity = Math.sin(k * Math.PI);
    }
  };
  return m;
}
