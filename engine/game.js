// 게임 엔진 = seed-kit 필름 엔진 + 입력 로그 + 작은 모드 기계.
//
// 결정론은 그대로: 관객의 톡 치기도 { f, dx } 로 "악보처럼" 기록되고, simTo 가 그 프레임에 다시 재생한다.
//
// 모드:  play ──골인──▶ goal ──2초──▶ (다음 씬 play | end)
//          └──시간 끝──▶ 같은 씬 0프레임부터 다시 (입력 로그 비움) — 겉보기엔 그냥 반복되는 애니메이션
import { W, H, FPS, EXPO } from './config.js';
import { setCam } from '../lib/draw.js';
import { post } from './post.js';
import { overlay } from './overlay.js';
import { audio, fireScore, sfx } from './sound.js';

export const SCENES = [];
export const game = {
  si: 0, scene: null, f: -1, clock: 0, mode: 'idle', modeT: 0, started: false, paused: false, smooth: false,
  inputs: [], loops: 0, cam: { x: W / 2, y: H / 2, z: 1 }, dirty: false,
};
let ctx = null;
const listeners = new Set();
export const onChange = fn => listeners.add(fn);
const changed = () => listeners.forEach(fn => fn(game));
export const nfOf = s => Math.round(s.dur * FPS);
export function mount(canvas) { ctx = canvas.getContext('2d', { alpha: false }); }
export const toWorld = (sx, sy) => { const c = game.cam; return [(sx - W / 2) / c.z + c.x, (sy - H / 2) / c.z + c.y]; };

// ── 결정론의 심장 ──
export function simTo(f) {
  const s = game.scene;
  if (game.f < 0 || f < game.f) { s.reset(); game.f = 0; }
  while (game.f < f) {
    game.f++;
    for (const k of game.inputs) if (k.f === game.f) s.poke(k.dx);     // 기록된 톡을 제 프레임에 재생
    s.step(1 / FPS, game.f / FPS, game.f);
    if (game.smooth || game.f % EXPO === 0) s.snap();
  }
}

export function render() {
  const s = game.scene, st = game.f / FPS;
  const e = game.smooth ? 0 : Math.floor(game.f / EXPO), sq = game.smooth ? st : Math.floor(game.f / EXPO) * EXPO / FPS;
  const cam = game.cam = s.cam(st);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#0c1719'; ctx.fillRect(0, 0, W, H);
  setCam(ctx, cam);
  s.draw(ctx, sq, e, cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  s.overlay(ctx, sq, e);
  overlay(ctx, game, e);
  post(ctx, e, game.smooth);
  game.dirty = false;
}

// ── 모드 전환 ──
function enter(mode) {
  game.mode = mode; game.modeT = 0;
  if (mode === 'goal') sfx({ k: 'fanfare', delay: .1 });
  changed();
}
function restart() { game.inputs = []; game.f = -1; game.clock = 0; audio.live = false; simTo(0); }
export function loadScene(i) { game.si = i; game.scene = SCENES[i]; restart(); enter('play'); render(); }
function loop() { game.loops++; restart(); fireScore(game.scene.scoreList, -1, 0); } // 0초 악보도 놓치지 않게

// 관객의 톡: 지금 보이는 공을 눌렀으면 다음 프레임에 기록, 아니면 허공 소리
export function poke(sx, sy) {
  if (game.mode !== 'play' || game.paused) return false;
  const [x, y] = toWorld(sx, sy), dx = game.scene.hit(x, y);
  if (dx == null) { sfx({ k: 'whoosh', v: .25, pan: sx / W * 2 - 1 }); return false; }
  game.inputs.push({ f: game.f + 1, dx });
  return true;
}
export function setSmooth(on) { game.smooth = on; const f = game.f; game.f = -1; audio.live = false; simTo(f); render(); changed(); }
export function pause(on = !game.paused) { if (game.mode === 'end') return; game.paused = on; changed(); }
export function begin(i = 0) { game.started = true; game.paused = false; game.loops = 0; loadScene(i); }

function advance(f) { if (f === game.f) return false; audio.live = true; simTo(f); audio.live = false; return true; }

let last = 0;
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  update(dt);
}
// 시계 한 칸. rAF 가 부르지만, 테스트는 직접 dt 를 넣어 돌릴 수 있다
export function update(dt) {
  if (!game.started || game.paused || game.mode === 'end') return;
  const s = game.scene, nf = nfOf(s);
  game.modeT += dt;
  let draw = game.dirty;
  if (game.mode === 'play') {
    const prev = game.clock; game.clock = prev + dt;
    if (Math.floor(game.clock * FPS + 1e-6) >= nf) { game.clock = Math.max(0, game.clock - nf / FPS); loop(); fireScore(s.scoreList, 0, game.clock); draw = true; }
    else fireScore(s.scoreList, prev, game.clock);
    draw = advance(Math.floor(game.clock * FPS + 1e-6)) || draw;
    if (s.goalF != null) enter('goal');
  } else if (game.mode === 'goal') {                                  // 셀러브레이션: 공은 그물 안에서 계속 움직이고 터진다
    game.clock += dt; advance(Math.floor(game.clock * FPS)); draw = true;
    if (game.modeT > 2.1) { if (game.si + 1 < SCENES.length) loadScene(game.si + 1); else enter('end'); }
  }
  if (draw) render();
  changed();
}
export const start = () => requestAnimationFrame(tick);
