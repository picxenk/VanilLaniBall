// 소리도 코드로 만든다 (샘플 없음). 세 갈래로 들어온다:
//   score  — 샷이 미리 적어둔 악보 이벤트 {t, k, ...}. 필름 시계가 지나갈 때 울린다.
//   emit   — 물리에서 태어난 소리(튕김 등). 실제 재생 중일 때만 울린다 (스크럽·되감기 재시뮬 중엔 침묵).
//   sfx    — 관객의 손(클릭)에서 나는 소리. 언제든 울린다.
import { clamp } from '../lib/math.js';

export const audio = { ac: null, master: null, on: false, muted: false, live: false };
let NOISE = null;

export function enable() {
  if (!audio.ac) {
    const ac = audio.ac = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    const comp = ac.createDynamicsCompressor(); comp.connect(ac.destination);
    audio.master = ac.createGain(); audio.master.gain.value = .9; audio.master.connect(comp);
    NOISE = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (audio.ac.state !== 'running') audio.ac.resume();
  audio.on = true;
}
export function setMuted(m) { audio.muted = m; if (audio.master) audio.master.gain.setTargetAtTime(m ? 0 : .9, audio.ac.currentTime, .03); }

const freq = n => { const m = /^([A-G])(#?)(\d)$/.exec(n), s = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); return 440 * 2 ** ((12 * (+m[3] + 1) + s - 69) / 12); };

// 악기 하나 = 함수 하나. e.k 로 고른다
const VOICES = {
  tok(ac, out, e, t) { // 종이 공이 바닥에 닿는 소리: 떨어지는 사인 + 짧은 노이즈
    const o = ac.createOscillator(), g = ac.createGain(), v = e.v ?? .6;
    o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(60, t + .14);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + .2);
    o.connect(g).connect(out); o.start(t); o.stop(t + .22);
    VOICES.tick(ac, out, { v: v * .5, f: 1800 }, t);
  },
  tick(ac, out, e, t) { // 짧은 종이 소리
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = NOISE; f.type = 'bandpass'; f.frequency.value = e.f ?? 3600; f.Q.value = 1.4;
    g.gain.setValueAtTime(e.v ?? .4, t); g.gain.exponentialRampToValueAtTime(.001, t + .045);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * .5); s.stop(t + .06);
  },
  chime(ac, out, e, t) { // 작은 종: 기음 + 비화성 배음
    const f0 = freq(e.n ?? 'E6'), v = e.v ?? .3;
    for (const [m, a, d] of [[1, 1, 1.4], [2.76, .35, .5], [5.4, .12, .25]]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f0 * m;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * a, t + .005); g.gain.exponentialRampToValueAtTime(.0005, t + d);
      o.connect(g).connect(out); o.start(t); o.stop(t + d + .05);
    }
  },
  whoosh(ac, out, e, t) { // 바람: 대역 필터가 쓸고 지나가는 노이즈
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), d = e.dur ?? .4;
    s.buffer = NOISE; f.type = 'bandpass'; f.Q.value = .8; f.frequency.setValueAtTime(e.f0 ?? 400, t); f.frequency.exponentialRampToValueAtTime(e.f1 ?? 1600, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(e.v ?? .3, t + d * .3); g.gain.linearRampToValueAtTime(0, t + d);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + d + .05);
  },
  // ── 게임용 목소리 ──
  kick(ac, out, e, t) { // 발로 찬 소리: tok 보다 높고 단단하게
    const o = ac.createOscillator(), g = ac.createGain(), v = e.v ?? .7;
    o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(90, t + .1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .003); g.gain.exponentialRampToValueAtTime(.001, t + .16);
    o.connect(g).connect(out); o.start(t); o.stop(t + .18);
    VOICES.tick(ac, out, { v: v * .6, f: 2600 }, t);
  },
  nope(ac, out, e, t) { // 지금은 찰 수 없음 (공중)
    for (const [dt, f] of [[0, 220], [.09, 180]]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(e.v ?? .18, t + dt + .01); g.gain.exponentialRampToValueAtTime(.001, t + dt + .1);
      o.connect(g).connect(out); o.start(t + dt); o.stop(t + dt + .12);
    }
  },
  swish(ac, out, e, t) { VOICES.whoosh(ac, out, { dur: .35, f0: 3200, f1: 1400, v: e.v ?? .4 }, t); }, // 그물에 들어가는 소리
  pop(ac, out, e, t) { // 종이 공이 종이 조각으로 터짐
    VOICES.tick(ac, out, { v: .6, f: 1400 }, t); VOICES.tick(ac, out, { v: .4, f: 4200 }, t + .03);
    const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(1500, t + .08);
    g.gain.setValueAtTime(e.v ?? .3, t); g.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(g).connect(out); o.start(t); o.stop(t + .14);
  },
  fanfare(ac, out, e, t) { (e.notes ?? ['C6', 'E6', 'G6', 'C7']).forEach((n, i) => VOICES.chime(ac, out, { n, v: e.v ?? .22 }, t + i * (e.step ?? .09))); },
  rewind(ac, out, e, t) { VOICES.whoosh(ac, out, { dur: e.dur ?? 1, f0: 2400, f1: 260, v: e.v ?? .3 }, t); },
  thud(ac, out, e, t) { VOICES.tok(ac, out, { v: e.v ?? .5 }, t); },
};

function play(e, when = 0) {
  const ac = audio.ac; if (!ac || audio.muted) return;
  const t = Math.max(ac.currentTime, when || ac.currentTime) + .005 + (e.delay ?? 0), p = ac.createStereoPanner();
  p.pan.value = clamp(e.pan ?? 0, -1, 1); p.connect(audio.master);
  VOICES[e.k]?.(ac, p, e, t);
}
export const emit = e => { if (audio.on && audio.live) play(e); };
export const sfx = e => { if (audio.on) play(e); };

// 악보: 씬마다 정렬된 이벤트 목록. 씬 시계가 (a, b] 를 지나면 울린다
export const sortScore = list => list.slice().sort((x, y) => x.t - y.t);
export function fireScore(list, a, b) { if (!audio.on || !list) return; for (const e of list) if (e.t > a && e.t <= b) play(e); }
