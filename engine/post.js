// 후처리: 노출 깜빡임(스톱모션 한 장 한 장이 각자의 사진) · 필름 그레인 · 렌즈 비네트
import { W, H } from './config.js';
import { hash, rng } from '../lib/math.js';
import { mk, g2 } from '../lib/draw.js';

const GS = 256;
const GRAIN = (() => {
  const c = mk(GS, GS), g = g2(c), id = g.createImageData(GS, GS), d = id.data, R = rng(99);
  for (let i = 0; i < GS * GS; i++) { const v = R(), k = i * 4; if (v < .5) { d[k] = 8; d[k + 1] = 16; d[k + 2] = 18; d[k + 3] = (.5 - v) * 60; } else { d[k] = 250; d[k + 1] = 244; d[k + 2] = 228; d[k + 3] = (v - .5) * 40; } }
  g.putImageData(id, 0, 0); return c;
})();
const VIGN = (() => {
  const c = mk(W, H), g = g2(c); g.translate(W / 2, H / 2); g.scale(1, H / W);
  const rg = g.createRadialGradient(0, 0, W * .22, 0, 0, W * .72);
  rg.addColorStop(0, 'rgba(4,14,16,0)'); rg.addColorStop(.7, 'rgba(4,14,16,.18)'); rg.addColorStop(1, 'rgba(4,14,16,.5)');
  g.fillStyle = rg; g.fillRect(-W, -W, W * 2, W * 2); return c;
})();
let pat = null;

export function post(ctx, e, smooth) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (!smooth) { const fl = (hash(e, 77) - .5) * .05; ctx.fillStyle = fl > 0 ? `rgba(255,244,226,${fl * .55})` : `rgba(4,14,16,${-fl * .7})`; ctx.fillRect(0, 0, W, H); }
  pat ??= ctx.createPattern(GRAIN, 'repeat');
  const ox = (hash(e + 1, 5) * GS) | 0, oy = (hash(e + 1, 6) * GS) | 0;     // 노출마다 그레인을 새로 깐다
  ctx.save(); ctx.translate(-ox, -oy); ctx.globalAlpha = .6; ctx.fillStyle = pat; ctx.fillRect(ox, oy, W, H); ctx.restore();
  ctx.drawImage(VIGN, 0, 0);
}
