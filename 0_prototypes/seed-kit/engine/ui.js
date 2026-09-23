// 재생 UI · 키보드 · 월드 찌르기(poke)
import { W, H, FPS, DUR, NF, EXPO } from './config.js';
import { clamp } from '../lib/math.js';
import { film, seek, play, setSmooth, onChange, toWorld } from './film.js';
import { audio, enable, setMuted, sfx } from './sound.js';

const $ = id => document.getElementById(id);

export function bindUI() {
  const cv = $('film'), scrub = $('scrub');
  scrub.max = NF - 1;
  const reveal = () => { film.started = true; $('start').hidden = true; };
  const begin = () => { reveal(); enable(); play(true); };             // 첫 사용자 제스처에서 오디오를 연다

  onChange(f => {
    $('pp').textContent = f.playing ? 'Pause' : 'Play';
    $('sm').textContent = f.smooth ? 'Smooth · 60/s' : 'Stop-motion · 12/s';
    $('snd').textContent = !audio.on ? 'Sound off' : audio.muted ? 'Muted' : 'Sound on';
    scrub.value = f.f; $('tc').textContent = `${(Math.max(0, f.f) / FPS).toFixed(2)} / ${DUR.toFixed(2)}`;
  });

  $('start').onclick = ev => { ev.stopPropagation(); begin(); };
  $('pp').onclick = () => film.started ? play() : begin();
  $('sm').onclick = () => setSmooth(!film.smooth);
  $('snd').onclick = () => { if (!audio.on) enable(); else setMuted(!audio.muted); seek(film.f); };
  scrub.oninput = () => { reveal(); play(false); seek(+scrub.value); };

  // 찌르기: 화면 좌표 → 캔버스 좌표 → 카메라 역변환 → 월드 좌표
  cv.addEventListener('pointerdown', ev => {
    if (!film.started) return begin();
    const r = cv.getBoundingClientRect(), sx = (ev.clientX - r.left) / r.width * W, sy = (ev.clientY - r.top) / r.height * H, [x, y] = toWorld(sx, sy);
    const hit = film.shot?.poke?.(x, y);
    if (!hit) sfx({ k: 'whoosh', v: .25, pan: sx / W * 2 - 1 });
    if (!film.playing) play(true);
  });

  addEventListener('keydown', ev => {
    if (ev.target.closest?.('button') && (ev.key === ' ' || ev.key === 'Enter')) return;
    const k = ev.key;
    if (k === ' ') { ev.preventDefault(); film.started ? play() : begin(); }
    else if (k === 'ArrowRight' || k === 'ArrowLeft') {
      ev.preventDefault(); reveal(); play(false);
      const step = film.smooth || ev.shiftKey ? 1 : EXPO, base = step === 1 ? film.f : Math.round(film.f / EXPO) * EXPO;
      seek(clamp(base + (k === 'ArrowRight' ? step : -step), 0, NF - 1));
    }
    else if (k === 's' || k === 'S') $('sm').click();
    else if (k === 'm' || k === 'M') $('snd').click();
  });
}
