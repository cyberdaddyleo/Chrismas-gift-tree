// 八音盒风格背景音乐（Jingle Bells，公版曲目）+ 交互音效，全部用 WebAudio 合成，无需音频文件
const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };
const MELODY = [
  ['E5', 1], ['E5', 1], ['E5', 2], ['E5', 1], ['E5', 1], ['E5', 2], ['E5', 1], ['G5', 1], ['C5', 1.5], ['D5', 0.5], ['E5', 4],
  ['F5', 1], ['F5', 1], ['F5', 1.5], ['F5', 0.5], ['F5', 1], ['E5', 1], ['E5', 1], ['E5', 0.5], ['E5', 0.5], ['E5', 1], ['D5', 1], ['D5', 1], ['E5', 1], ['D5', 2], ['G5', 2],
  ['E5', 1], ['E5', 1], ['E5', 2], ['E5', 1], ['E5', 1], ['E5', 2], ['E5', 1], ['G5', 1], ['C5', 1.5], ['D5', 0.5], ['E5', 4],
  ['F5', 1], ['F5', 1], ['F5', 1], ['F5', 1], ['F5', 1], ['E5', 1], ['E5', 1], ['E5', 0.5], ['E5', 0.5], ['G5', 1], ['G5', 1], ['F5', 1], ['D5', 1], ['C5', 4], [null, 4],
];
const BASS = ['C4', 'C4', 'C4', 'C4', 'F4', 'C4', 'G4', 'G4', 'C4', 'C4', 'C4', 'C4', 'F4', 'C4', 'G4', 'C4', null];

export class Sound {
  constructor() { this.ctx = null; this.musicOn = false; this.timer = null; }
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.5; this.musicBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }
  bell(freq, t, dur = 1.8, vol = 0.18, bus) {
    const c = this.ctx, g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(bus || this.master);
    for (const [mul, v] of [[1, 1], [2.0, 0.28], [4.07, 0.12]]) {
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sine'; o.frequency.value = freq * mul; og.gain.value = v;
      o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.05);
    }
  }
  chime() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    ['C6', 'E6', 'G6', 'C6'].forEach((n, i) => this.bell(N[n] * (i === 3 ? 2 : 1), t + i * 0.07, 1.4, 0.12));
  }
  whoosh(up = true) {
    if (!this.ensure()) return;
    const c = this.ctx, t = c.currentTime, len = 0.9;
    const buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(up ? 400 : 2400, t); f.frequency.exponentialRampToValueAtTime(up ? 2600 : 380, t + len);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(this.master); src.start(t);
    [0, 1, 2, 3, 4].forEach((i) => this.bell(N[up ? ['C6', 'E6', 'G6', 'E6', 'C6'][i] : ['G6', 'E6', 'C6', 'G5', 'E5'][i]], t + 0.08 + i * 0.06, 0.9, 0.05));
  }
  // 抽奖悬念：越来越快的小鼓点
  tick(v = 0.6) {
    if (!this.ensure()) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(900 + v * 500, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.06);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * (0.5 + v), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.1);
  }
  // 揭晓：一串上行的铃声
  fanfare() {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((n, i) => this.bell(N[n], t + i * 0.07, 1.8, 0.14));
    ['C5', 'E5', 'G5'].forEach((n) => this.bell(N[n], t + 0.5, 2.4, 0.08));
  }
  setMusic(on) {
    this.musicOn = on;
    if (on) { if (!this.ensure()) return; this.startLoop(); }
    else if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  startLoop() {
    if (this.timer) return;
    const beat = 60 / 128;
    let idx = 0, nextT = this.ctx.currentTime + 0.15, bar = 0, beatInBar = 0;
    const schedule = () => {
      while (nextT < this.ctx.currentTime + 0.35) {
        const [n, len] = MELODY[idx];
        if (n) this.bell(N[n], nextT, 1.6, 0.13, this.musicBus);
        if (beatInBar === 0 && BASS[bar % BASS.length]) this.bell(N[BASS[bar % BASS.length]] / 2, nextT, 2.4, 0.07, this.musicBus);
        nextT += len * beat; beatInBar += len;
        while (beatInBar >= 4) { beatInBar -= 4; bar++; }
        idx = (idx + 1) % MELODY.length;
        if (idx === 0) { bar = 0; beatInBar = 0; }
      }
    };
    schedule();
    this.timer = setInterval(schedule, 90);
  }
}
