// 캔버스 도구 — 굽기(bake)와 놓기(put), 손으로 오린 도형, 카메라
import { W, H } from '../engine/config.js';
import { TAU, clamp, rng, boil } from './math.js';
import { noise, fbm } from './noise.js';

// 스탬프 글자: 한 노출에 한 글자씩 "놓는다". lettersAt(t) = 시각 t 에 보이는 글자 수 (t<0 이면 0 이하)
export const lettersAt = (t, per = 1 / 12) => Math.floor(t / per + 1e-6) + 1;
export function stampText(ctx, text, x, y, { n = text.length, size = 130, e = 0, id = 100, color = '#efe8d6', font = 'italic %spx ui-serif, Georgia, serif', pop = true, alpha = 1 } = {}) {
  n = Math.min(n, text.length); if (n <= 0) return;
  ctx.save(); ctx.font = font.replace('%s', size); ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(6,20,24,.35)'; ctx.shadowOffsetX = size * .035; ctx.shadowOffsetY = size * .05; ctx.shadowBlur = size * .05;
  let cx = x - ctx.measureText(text).width / 2;
  for (let i = 0; i < text.length; i++) {
    const w = ctx.measureText(text[i]).width;
    if (i < n) { const [lx, ly, lr] = boil(id + i, e, size / 180), s = pop && n < text.length && i === n - 1 ? 1.08 : 1; ctx.save(); ctx.translate(cx + w / 2 + lx, y + ly); ctx.rotate(lr); ctx.scale(s, s); ctx.fillText(text[i], -w / 2, 0); ctx.restore(); }
    cx += w;
  }
  ctx.restore();
}

export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
export const g2 = c => c.getContext('2d');

// 모션 컨트롤 카메라. p=1 은 퍼펫 평면, p<1 은 더 먼 층(패럴랙스)
export function setCam(c, cam, p = 1) {
  const z = 1 + (cam.z - 1) * p, cx = W / 2 + (cam.x - W / 2) * p, cy = H / 2 + (cam.y - H / 2) * p;
  c.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z);
}

// 손으로 오린 타원: 둘레를 노이즈로 살짝 흔든다
export function blobPath(g, cx, cy, rx, ry, { n = 56, amp = .03, seed = 1, freq = 1.3 } = {}) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU, r = 1 + amp * noise(Math.cos(a) * freq + seed * 1.7, Math.sin(a) * freq - seed * 2.3);
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}

export function stipple(g, x, y, w, h, { n = 400, col = '#fff', r = 1.2, a = .3, seed = 2 } = {}) {
  const R = rng(seed); g.save(); g.fillStyle = col;
  for (let i = 0; i < n; i++) { g.globalAlpha = a * (.3 + .7 * R()); const s = r * (.5 + R()); g.fillRect(x + R() * w, y + R() * h, s, s); }
  g.restore();
}

// 인쇄된 배경판: 그라디언트 + 노이즈 얼룩 + 먼지
export function backdrop(w, h, { top, bottom, seed = 5, mottle = .5, dust = 1400 } = {}) {
  const c = mk(w, h), g = g2(c), gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom ?? top); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const div = 24, sw = Math.ceil(w / div), sh = Math.ceil(h / div), m = mk(sw, sh), mg = g2(m), id = mg.createImageData(sw, sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const k = (y * sw + x) * 4, v = clamp(128 + fbm(x * .09 + seed, y * .09 - seed) * 200, 0, 255); id.data[k] = id.data[k + 1] = id.data[k + 2] = v; id.data[k + 3] = 255; }
  mg.putImageData(id, 0, 0);
  g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = mottle; g.imageSmoothingQuality = 'high'; g.drawImage(m, 0, 0, w, h); g.restore();
  stipple(g, 0, 0, w, h, { n: dust, col: '#ece4cf', a: .18, seed: seed + 1 });
  stipple(g, 0, 0, w, h, { n: dust * .6, col: '#0c1c20', a: .2, seed: seed + 2 });
  return c;
}

// 스프라이트: 한 번 그려 굽고 + 부드러운 접촉 그림자도 함께 굽는다. (ax, ay) = 앵커
export function sprite(w, h, ax, ay, draw, { pad = 24, shadow = { dx: 6, dy: 9, blur: 10, a: .3 } } = {}) {
  const c = mk(w + pad * 2, h + pad * 2), g = g2(c);
  g.translate(pad, pad); g.lineJoin = g.lineCap = 'round'; draw(g);
  let s = null;
  if (shadow) { s = mk(c.width, c.height); const sg = g2(s), off = c.width + 64; sg.shadowColor = `rgba(6,20,24,${shadow.a})`; sg.shadowBlur = shadow.blur; sg.shadowOffsetX = off; sg.drawImage(c, -off, 0); }
  return { c, s, ax: ax + pad, ay: ay + pad, sh: shadow };
}
// 놓기: translate → scale(월드 축, 찌그러짐) → rotate(퍼펫 자체 회전). 그림자 오프셋은 월드 기준(조명 하나)
export function put(ctx, sp, x, y, { rot = 0, sx = 1, sy = 1, alpha = 1, shadow = true } = {}) {
  const draw = (img, ox, oy) => { ctx.save(); ctx.translate(x + ox, y + oy); ctx.scale(sx, sy); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.drawImage(img, -sp.ax, -sp.ay); ctx.restore(); };
  if (sp.s && shadow) draw(sp.s, sp.sh.dx, sp.sh.dy);
  draw(sp.c, 0, 0);
}
