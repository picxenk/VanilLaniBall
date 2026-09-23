// 엔진의 심장: 필름 시계 · 결정론적 재시뮬레이션 · 스톱모션 노출 · 렌더 · 재생
//
// 샷 계약 (shots/*.js 가 구현):
//   name, t0                       이름, 필름 안에서 시작하는 초
//   build()                        한 번: 스프라이트·배경 굽기
//   reset()                        샷의 0프레임 상태로 (결정론의 출발점)
//   step(dt, st, sf)               고정 60Hz 물리 한 걸음 (st: 샷 안의 초, sf: 샷 안의 프레임)
//   snap()                         지금 상태를 "카메라가 보는 포즈"로 복사 (EXPO 프레임마다)
//   draw(ctx, sq, e, cam)          스냅된 포즈만 그린다 (sq: 포즈 시각, e: 노출 번호)
//   cam(st)                        모션 컨트롤 카메라 {x, y, z} — 매 프레임 부드럽게
//   score()?                       샷 기준 시각의 악보 이벤트 [{t, k, ...}]
//   poke(x, y)?                    관객이 월드를 찔렀을 때. 맞았으면 true
import { W, H, FPS, DUR, NF, EXPO } from './config.js';
import { clamp } from '../lib/math.js';
import { setCam } from '../lib/draw.js';
import { post } from './post.js';
import { audio, fireScore } from './sound.js';

export const SHOTS = [];
export const film = { f: -1, idx: -1, shot: null, playing: false, smooth: false, clock: 0, cam: { x: W / 2, y: H / 2, z: 1 }, started: false };
let ctx = null;
const listeners = new Set();
export const onChange = fn => listeners.add(fn);
const changed = () => listeners.forEach(fn => fn(film));

export function mount(canvas) { ctx = canvas.getContext('2d', { alpha: false }); }
export const toWorld = (sx, sy) => { const c = film.cam; return [(sx - W / 2) / c.z + c.x, (sy - H / 2) / c.z + c.y]; };
export const f0Of = s => Math.round(s.t0 * FPS);
const shotAt = f => { let i = 0; SHOTS.forEach((s, k) => { if (f >= f0Of(s)) i = k; }); return i; };

// 다른 샷이거나 뒤로 가면 reset → 고정 dt 로 f 까지 다시 걷는다. 그래서 어느 프레임이든 항상 같은 그림.
export function simTo(f) {
  const i = shotAt(f), s = SHOTS[i], f0 = f0Of(s);
  if (i !== film.idx || f < film.f) { film.idx = i; film.shot = s; s.reset(); film.f = f0; }
  while (film.f < f) { film.f++; const sf = film.f - f0; s.step(1 / FPS, sf / FPS, sf); if (film.smooth || sf % EXPO === 0) s.snap(); }
}

export function render() {
  const s = film.shot, sf = film.f - f0Of(s), st = sf / FPS;
  const e = film.smooth ? 0 : Math.floor(film.f / EXPO);             // 노출 번호
  const sq = film.smooth ? st : Math.floor(sf / EXPO) * EXPO / FPS;  // 포즈 시각
  const cam = film.cam = s.cam(st);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#0c1719'; ctx.fillRect(0, 0, W, H);
  setCam(ctx, cam);
  s.draw(ctx, sq, e, cam);
  post(ctx, e, film.smooth);
}

// ── 재생 ──
export function seek(f) { audio.live = false; simTo(clamp(Math.round(f), 0, NF - 1)); render(); film.clock = film.f / FPS; changed(); }
export function play(on = !film.playing) { film.playing = on; if (on && film.f >= NF - 1) seek(0); film.clock = film.f / FPS; changed(); }
export function setSmooth(on) { film.smooth = on; film.idx = -1; seek(film.f); } // 스냅 규칙이 바뀌니 처음부터 다시

let last = 0;
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (!film.playing) return;
  const prev = film.clock; let t = prev + dt, wrapped = false;
  if (t >= DUR) { t -= DUR; wrapped = true; }                         // 루프
  film.clock = t;
  const f = clamp(Math.floor(t * FPS), 0, NF - 1);
  if (f !== film.f) { audio.live = true; simTo(f); audio.live = false; render(); changed(); }
  if (wrapped) { fireScore(prev, DUR + 1); fireScore(-1, t); } else fireScore(prev, t);
}
export const start = () => requestAnimationFrame(tick);
