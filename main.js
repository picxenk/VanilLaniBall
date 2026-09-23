// 부트: 씬 등록 → 굽기 → 악보 → UI → 시계
import { SCENES, game, mount, loadScene, simTo, render, begin, poke, start, update } from './engine/game.js';
import { sortScore } from './engine/sound.js';
import { bindUI } from './engine/ui.js';
import hello from './scenes/01-hello.js';
import yes from './scenes/02-game.js';
import far from './scenes/03-far.js';

SCENES.push(hello, yes, far);            // ← 씬 추가는 여기

const Q = new URLSearchParams(location.search);
mount(document.getElementById('film'));
for (const s of SCENES) { s.build(); s.scoreList = sortScore(s.score()); }
game.smooth = Q.get('smooth') === '1';
bindUI();

// ?scene=N (1부터) · ?frame=F 로 특정 씬의 특정 프레임을 정지 화면으로 (헤드리스 캡처용) · ?ui=0
if (Q.get('ui') === '0') document.documentElement.classList.add('bare');
const si = Math.max(0, Math.min(SCENES.length - 1, (+Q.get('scene') || 1) - 1));
loadScene(si);
if (Q.has('frame')) { document.getElementById('start').hidden = true; simTo(+Q.get('frame')); render(); }
start();

// 테스트 훅
window.__game = {
  info: () => ({ scene: game.scene.name, si: game.si, mode: game.mode, f: game.f, goalF: game.scene.goalF, loops: game.loops, pokes: game.scene.pokes }),
  begin: i => { document.getElementById('start').hidden = true; begin(i ?? 0); },
  poke, // poke(sx, sy) 캔버스 좌표
  frame: f => { simTo(f); render(); return game.f; },
  update: (sec, dt = 1 / 60) => { for (let t = 0; t < sec - 1e-9; t += dt) update(dt); return window.__game.info(); }, // 시계를 직접 돌린다
  pause: () => { game.paused = true; },
  scene: () => game.scene, cam: () => game.cam,
};
window.__READY = true;
