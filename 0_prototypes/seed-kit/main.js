// 부트: 샷을 등록하고, 굽고, 악보를 모으고, UI 를 묶고, 시계를 돌린다.
import { FPS } from './engine/config.js';
import { SHOTS, film, mount, seek, play, start } from './engine/film.js';
import { setScore, getScore } from './engine/sound.js';
import { bindUI } from './engine/ui.js';
import hello from './shots/01-hello.js';

SHOTS.push(hello);                       // ← 샷 추가는 여기

const Q = new URLSearchParams(location.search);
mount(document.getElementById('film'));
SHOTS.forEach(s => s.build());
setScore(SHOTS.flatMap(s => (s.score?.() ?? []).map(e => ({ ...e, t: e.t + s.t0 }))));  // 샷 기준 → 절대 시각
film.smooth = Q.get('smooth') === '1';
bindUI();

if (Q.get('ui') === '0') document.documentElement.classList.add('bare');
const jump = Q.has('frame') ? +Q.get('frame') : Q.has('t') ? +Q.get('t') * FPS : null;
if (jump != null || Q.get('ui') === '0') { film.started = true; document.getElementById('start').hidden = true; }
seek(jump ?? 0);
start();

// 테스트 훅 (헤드리스 캡처)
window.__film = { seek: f => { seek(f); return film.f; }, play, info: () => ({ f: film.f, shot: film.shot?.name, smooth: film.smooth }), score: getScore };
window.__READY = true;
