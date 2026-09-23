// 재생 UI(필름 플레이어처럼 보이게) · 톡 치기 · 키보드 · 엔드 카드
import { W, H, FPS } from './config.js';
import { game, SCENES, onChange, begin, pause, poke, setSmooth, nfOf } from './game.js';
import { audio, enable, setMuted } from './sound.js';

const $ = id => document.getElementById(id);

export function bindUI() {
  const cv = $('film');
  const start = () => { $('start').hidden = true; $('card').hidden = true; enable(); begin(0); };

  onChange(g => {
    const s = g.scene; if (!s) return;
    $('pp').textContent = g.paused ? 'Play' : 'Pause';
    $('shot').textContent = `Shot ${g.si + 1}/${SCENES.length}`;
    $('sm').textContent = g.smooth ? 'Smooth · 60/s' : 'Stop-motion · 12/s';
    $('snd').textContent = !audio.on ? 'Sound off' : audio.muted ? 'Muted' : 'Sound on';
    const t = Math.min(g.f, nfOf(s)) / FPS; $('fill').style.width = `${Math.min(100, t / s.dur * 100)}%`;
    $('tc').textContent = `${t.toFixed(2)} / ${s.dur.toFixed(2)}`;
    $('fill').className = g.mode === 'goal' ? 'goal' : '';
    if (g.mode === 'end' && $('card').hidden) {
      $('card-spec').textContent = `${SCENES.length} shots · ${g.loops} loop${g.loops === 1 ? '' : 's'}`;
      $('card').hidden = false;
    }
  });

  $('start').onclick = ev => { ev.stopPropagation(); start(); };
  $('again').onclick = ev => { ev.stopPropagation(); start(); };
  $('pp').onclick = () => game.started ? pause() : start();
  $('sm').onclick = () => setSmooth(!game.smooth);
  $('snd').onclick = () => { if (!audio.on) enable(); else setMuted(!audio.muted); };

  // 톡 치기 (seed-kit 과 같은 찌르기): 화면 좌표 → 캔버스 좌표 → 카메라 역변환은 poke() 안에서
  cv.addEventListener('pointerdown', ev => {
    if (!game.started) return start();
    const r = cv.getBoundingClientRect();
    poke((ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H);
  });

  addEventListener('keydown', ev => {
    if (ev.target.closest?.('button') && (ev.key === ' ' || ev.key === 'Enter')) return;
    const k = ev.key;
    if (k === ' ') { ev.preventDefault(); game.started ? pause() : start(); }
    else if (k === 's' || k === 'S') $('sm').click();
    else if (k === 'm' || k === 'M') $('snd').click();
  });
}
