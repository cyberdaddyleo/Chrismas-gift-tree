// 摄像头 + MediaPipe 手部关键点 → 手势（张开 / 握拳 / 捏合）+ 手的位置
// 资源加载顺序：① 单文件版内嵌的模型（双击 html 也能用）② 同目录 lib/ models/ ③ 公共 CDN
const BASE = (() => {
  try { return new URL('..', import.meta.url).href; } catch (_) {}
  try { return new URL('.', location.href).href; } catch (_) {}
  return ''; // 在预览窗口（about:blank）里打开时没有正常地址，不能让它把整个页面带崩
})();
const LOCAL = { wasm: BASE + 'lib/mediapipe/wasm', model: BASE + 'models/hand_landmarker.task' };
const REMOTE = {
  bundle: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/vision_bundle.mjs',
  wasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm',
  model: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
};
const OPTS = { runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5 };

const CONN = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

export class GestureController {
  constructor({ video, canvas, onStatus, onGesture }) {
    this.video = video; this.canvas = canvas; this.ctx = canvas ? canvas.getContext('2d') : null;
    this.onStatus = onStatus; this.onGesture = onGesture;
    this.running = false; this.ready = false;
    this.lastVideoTime = -1; this.lastRun = 0;
    this.raw = 'none'; this.rawCount = 0; this.stable = 'none';
    this.hand = { visible: false, x: 0.5, y: 0.5, lastSeen: 0 };
  }

  async start() {
    if (this.running) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onStatus('error', '这里用不了摄像头（需要 https 网址或本机 localhost），先用鼠标玩吧');
      return false;
    }
    this.onStatus('loading', '正在请求摄像头…');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    } catch (e) {
      const msg = e && e.name === 'NotAllowedError' ? (location.protocol === 'file:' && !/Chrome|Edg/.test(navigator.userAgent) ? '这个浏览器不允许本地文件用摄像头，请用 Chrome 打开' : '摄像头权限被拒绝了，可以在地址栏左侧重新允许') : e && e.name === 'NotFoundError' ? '没有检测到摄像头' : '摄像头打不开：' + (e && e.message ? e.message : e);
      this.onStatus('error', msg);
      return false;
    }
    this.video.srcObject = this.stream;
    this.video.muted = true; this.video.playsInline = true;
    try { await this.video.play(); } catch (_) {}
    this.running = true;
    if (!this.landmarker) {
      this.onStatus('loading', '正在加载手势模型（约 8MB，只需一次）…');
      this.landmarker = await this.loadModel();
      if (!this.landmarker) {
        this.onStatus('error', '手势模型加载失败，先用鼠标玩吧');
        this.stop();
        return false;
      }
    }
    this.ready = true;
    this.onStatus('ready', '把手举到摄像头前');
    return true;
  }

  async loadModel() {
    const tries = [];
    const embedded = globalThis.__GT_ASSETS__;
    try {
      const vision = await import('../lib/mediapipe/vision_bundle.js');
      if (embedded) {
        const a = await embedded();
        tries.push([vision, { wasmLoaderPath: a.loader, wasmBinaryPath: a.wasm }, () => ({ modelAssetBuffer: new Uint8Array(a.model) })]);
      } else {
        const fs = await vision.FilesetResolver.forVisionTasks(LOCAL.wasm);
        tries.push([vision, fs, () => ({ modelAssetPath: LOCAL.model })]);
      }
    } catch (e) { console.warn('[gesture] local load failed', e); }
    for (const [vision, fileset, model] of tries) {
      for (const delegate of ['GPU', 'CPU']) {
        try { return await vision.HandLandmarker.createFromOptions(fileset, { baseOptions: { ...model(), delegate }, ...OPTS }); }
        catch (e) { console.warn('[gesture] delegate failed', delegate, e); }
      }
    }
    if (!embedded) {
      try {
        const url = REMOTE.bundle;
        const vision = await import(/* @vite-ignore */ url);
        const fs = await vision.FilesetResolver.forVisionTasks(REMOTE.wasm);
        return await vision.HandLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: REMOTE.model, delegate: 'GPU' }, ...OPTS });
      } catch (e) { console.warn('[gesture] remote load failed', e); }
    }
    return null;
  }

  stop() {
    this.running = false; this.ready = false;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null; this.video.srcObject = null;
    this.hand.visible = false;
    this.setStable('none');
  }

  update(now) {
    if (!this.ready || !this.running) return;
    const v = this.video;
    if (v.readyState < 2 || v.currentTime === this.lastVideoTime || now - this.lastRun < 30) {
      if (this.hand.visible && now - this.hand.lastSeen > 700) { this.hand.visible = false; this.push('none'); }
      return;
    }
    this.lastVideoTime = v.currentTime; this.lastRun = now;
    let res;
    try { res = this.landmarker.detectForVideo(v, now); } catch (e) { return; }
    const lm = res && res.landmarks && res.landmarks[0];
    this.draw(lm);
    if (!lm) {
      if (now - this.hand.lastSeen > 500) { this.hand.visible = false; this.push('none'); }
      return;
    }
    this.hand.lastSeen = now; this.hand.visible = true;
    const g = this.classify(lm);
    // 光标：捏合时取拇指与食指中点，否则取掌心；镜像，并把画面中间 70% 映射到全屏
    const pt = g === 'pinch' ? { x: (lm[4].x + lm[8].x) / 2, y: (lm[4].y + lm[8].y) / 2 } : avg(lm, [0, 5, 9, 13, 17]);
    const tx = clamp01((1 - pt.x - 0.15) / 0.7), ty = clamp01((pt.y - 0.12) / 0.66);
    const k = 0.4;
    this.hand.x += (tx - this.hand.x) * k; this.hand.y += (ty - this.hand.y) * k;
    this.push(g);
  }

  classify(lm) {
    const ar = (this.video.videoWidth || 4) / (this.video.videoHeight || 3);
    const d = (a, b) => Math.hypot((lm[a].x - lm[b].x) * ar, lm[a].y - lm[b].y);
    const hs = d(0, 9) || 1e-3;
    const ext = [[8, 6], [12, 10], [16, 14], [20, 18]].map(([tip, pip]) => d(tip, 0) > d(pip, 0) * 1.12);
    const count = ext.filter(Boolean).length;
    const pinch = d(4, 8) / hs;
    const reach = d(8, 0) / hs;
    const thumbOut = d(4, 17) / hs;
    if (pinch < 0.3 && reach > 0.95) return 'pinch';
    if (count >= 4 && thumbOut > 0.9) return 'open';
    if (count >= 4) return 'open';
    if (count === 0 && reach < 1.35) return 'fist';
    return 'none';
  }

  push(g) {
    if (g === this.raw) this.rawCount++; else { this.raw = g; this.rawCount = 1; }
    const need = g === 'none' ? 5 : 3;
    if (this.rawCount >= need && this.stable !== g) this.setStable(g);
  }
  setStable(g) { const prev = this.stable; this.stable = g; this.onGesture(g, prev); }

  draw(lm) {
    if (!this.canvas) return;
    const c = this.canvas, g = this.ctx;
    const W = (c.width = c.clientWidth * 1.5), H = (c.height = c.clientHeight * 1.5);
    g.clearRect(0, 0, W, H);
    if (!lm) return;
    const col = { pinch: '#ffd36b', open: '#7cf0c8', fist: '#ff8fa3', none: '#cfe0ff' }[this.raw] || '#fff';
    g.lineWidth = 2.5; g.strokeStyle = col; g.fillStyle = col;
    const P = (i) => [(1 - lm[i].x) * W, lm[i].y * H];
    for (const [a, b] of CONN) { const [x1, y1] = P(a), [x2, y2] = P(b); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    for (let i = 0; i < 21; i++) { const [x, y] = P(i); g.beginPath(); g.arc(x, y, i % 4 === 0 ? 4 : 2.5, 0, 7); g.fill(); }
  }
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
function avg(lm, idx) { let x = 0, y = 0; for (const i of idx) { x += lm[i].x; y += lm[i].y; } return { x: x / idx.length, y: y / idx.length }; }
