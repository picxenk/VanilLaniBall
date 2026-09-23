// 종이 소품 스프라이트: 공 · 골대(뒤/앞 두 장) · 벽돌 벽 · 선반. 모두 한 번 굽는다.
import { TAU, rng } from '../lib/math.js';
import { sprite, blobPath } from '../lib/draw.js';

export const POST = '#efe8d6', STRIPE = '#cf4b40';

export function makeBall(r, col = '#cf4b40', seed = 3) {
  const k = r / 70;
  return sprite(r * 2, r * 2, r, r, g => {
    blobPath(g, r, r, r, r, { seed, amp: .035 }); g.fillStyle = col; g.fill();
    g.save(); g.clip();
    g.fillStyle = 'rgba(60,10,10,.28)'; blobPath(g, r + 18 * k, r + 22 * k, r, r, { seed: seed + 1 }); g.fill();
    g.fillStyle = 'rgba(239,232,214,.9)'; g.beginPath(); g.ellipse(r - 26 * k, r - 30 * k, 20 * k, 11 * k, -.6, 0, TAU); g.fill();
    g.restore();
  }, { shadow: { dx: 5, dy: 7, blur: 8, a: .28 } });
}

// 줄무늬 기둥 (가로/세로)
function bar(g, x, y, w, h) {
  g.fillStyle = POST; g.fillRect(x, y, w, h);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = STRIPE;
  const L = Math.max(w, h), vert = h > w;
  for (let s = 20; s < L; s += 56) vert ? g.fillRect(x, y + s, w, 22) : g.fillRect(x + s, y, 22, h);
  g.restore();
  g.fillStyle = 'rgba(6,20,24,.18)'; vert ? g.fillRect(x + w * .6, y, w * .4, h) : g.fillRect(x, y + h * .6, w, h * .4);
}

// 골대 로컬 좌표: (0,0)=안쪽 왼쪽 위, 바닥은 y=h. 크로스바는 y=-16..2, 뒤 기둥은 x=w-14..w+6
export function makeGoal(w, h) {
  const opt = { shadow: { dx: 6, dy: 8, blur: 9, a: .3 } };
  const back = sprite(w + 24, h + 20, 10, 18, g => {
    g.translate(10, 18);
    g.save(); g.beginPath(); g.rect(0, 0, w - 12, h); g.clip();
    g.fillStyle = 'rgba(239,232,214,.07)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(239,232,214,.34)'; g.lineWidth = 2;
    for (let s = -h; s < w + h; s += 24) { g.beginPath(); g.moveTo(s, 0); g.lineTo(s + h, h); g.moveTo(s + h, 0); g.lineTo(s, h); g.stroke(); }
    g.restore();
    bar(g, w - 14, -16, 18, h + 16);
    bar(g, -8, -16, w + 16, 18);
  }, opt);
  const front = sprite(20, h + 20, 10, 18, g => { g.translate(10, 18); bar(g, -8, -16, 16, h + 16); }, opt);
  return { back, front };
}

export function makeBrick(w, h, seed = 11, col = '#c86a47') {
  return sprite(w, h, 0, 0, g => {
    const R = rng(seed); g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(40,16,10,.4)'; g.lineWidth = 3;
    for (let y = 0, row = 0; y < h; y += 34, row++) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      for (let x = (row % 2) * 35; x < w; x += 70) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, Math.min(h, y + 34)); g.stroke(); }
    }
    for (let i = 0; i < w * h / 90; i++) { g.fillStyle = R() < .5 ? 'rgba(255,240,220,.12)' : 'rgba(40,16,10,.14)'; g.fillRect(R() * w, R() * h, 2, 2); }
    g.fillStyle = 'rgba(255,240,220,.28)'; g.fillRect(0, 0, w, 4);
  });
}

export function makeShelf(w, h, col = '#46565c') {
  return sprite(w, h + 70, 0, 0, g => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(231,222,200,.3)'; g.fillRect(0, 0, w, 4);
    g.beginPath(); g.moveTo(w - 30, h); g.lineTo(w - 30, h + 70); g.lineTo(w - 110, h); g.closePath(); g.fillStyle = col; g.fill(); // 받침
  });
}
