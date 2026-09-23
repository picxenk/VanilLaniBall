// 샷 01 · Hello — 종이 공 하나가 튀어 들어오고, 글자가 한 노출에 한 자씩 놓인다.
// 새 샷을 만들려면 이 파일을 복사해 t0 를 바꾸고 main.js 의 SHOTS 에 추가한다.
import { W, H, DUR } from '../engine/config.js';
import { TAU, clamp, eo, boil } from '../lib/math.js';
import { mk, g2, sprite, put, blobPath, backdrop, setCam } from '../lib/draw.js';
import { emit, sfx } from '../engine/sound.js';

const FLOOR = 900, BR = 70, G = 3000;
const TEXT = 'Hello, world', T_TEXT = 1.25, PER = 1 / 12; // 1.25초부터 노출마다 한 글자

export default {
  name: 'hello', t0: 0,

  build() {
    this.ball = sprite(BR * 2, BR * 2, BR, BR, g => {
      blobPath(g, BR, BR, BR, BR, { seed: 3, amp: .035 }); g.fillStyle = '#cf4b40'; g.fill();
      g.save(); g.clip();
      g.fillStyle = 'rgba(60,10,10,.28)'; blobPath(g, BR + 18, BR + 22, BR, BR, { seed: 4 }); g.fill();
      g.fillStyle = 'rgba(239,232,214,.9)'; g.beginPath(); g.ellipse(BR - 26, BR - 30, 20, 11, -.6, 0, TAU); g.fill();
      g.restore();
    });
    // 멀리 있는 벽(패럴랙스 p=.85)은 카메라 이동 여유만큼 크게, 바닥은 퍼펫 평면(p=1)
    this.wall = backdrop(W + 160, H + 90, { top: '#4f8b92', bottom: '#2f6369', seed: 5, mottle: .35 });
    this.floor = backdrop(W + 160, H - FLOOR + 60, { top: '#3d5257', bottom: '#2c3d41', seed: 9, mottle: .6 });
    const g = g2(this.floor); g.fillStyle = 'rgba(231,222,200,.28)'; g.fillRect(0, 0, W + 160, 3);
  },

  reset() { this.b = { x: 180, y: 260, vx: 420, vy: 0, sq: 1, spin: 0 }; this.snap(); },

  step(dt) {
    const b = this.b;
    if (b.hold > 0) {                                                        // 바닥에 닿아 찌그러진 채 잠깐 머문다
      b.hold -= dt; b.x += b.vx * dt; if (b.hold <= 0) b.vy = b.launch;
    } else {
      b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y >= FLOOR) {
        b.y = FLOOR;
        if (b.vy > 160) {
          emit({ k: 'tok', v: clamp(b.vy / 2200, .12, .9), pan: b.x / W * 2 - 1 });   // 물리에서 태어난 소리
          b.sq = clamp(1 - b.vy / 5200, .55, 1); b.launch = -b.vy * .66; b.vy = 0; b.vx *= .86; b.hold = .06;
        } else { b.vy = 0; b.vx *= Math.exp(-dt * 1.6); }
      }
      b.sq += (1 - b.sq) * (1 - Math.exp(-dt * 14));
    }
    b.spin += b.vx * dt / BR;
  },

  snap() { const b = this.b; b.rx = b.x; b.ry = b.y; b.rsq = b.sq; b.rspin = b.spin; },

  draw(ctx, sq, e, cam) {
    setCam(ctx, cam, .85); ctx.drawImage(this.wall, -80, -45);
    setCam(ctx, cam, 1); ctx.drawImage(this.floor, -80, FLOOR);
    const b = this.b, [bx, by, br] = boil(1, e), hgt = clamp((FLOOR - b.ry) / 600, 0, 1), s = b.rsq;
    ctx.fillStyle = `rgba(6,20,24,${.35 - hgt * .2})`; ctx.beginPath(); ctx.ellipse(b.rx + 10, FLOOR + 4, BR * (1.1 - hgt * .4), 12, 0, 0, TAU); ctx.fill();
    put(ctx, this.ball, b.rx + bx, b.ry + by - BR * s, { rot: b.rspin + br, sx: 1 / Math.sqrt(s), sy: s });
    // 글자 스탑모션
    const shown = Math.floor((sq - T_TEXT) / PER + 1e-6) + 1;
    if (shown > 0) {
      ctx.font = 'italic 150px ui-serif, Georgia, serif'; ctx.fillStyle = '#efe8d6';
      ctx.shadowColor = 'rgba(6,20,24,.35)'; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 7; ctx.shadowBlur = 8;
      let x = W / 2 - ctx.measureText(TEXT).width / 2;
      for (let i = 0; i < TEXT.length; i++) {
        const w = ctx.measureText(TEXT[i]).width;
        if (i < shown) { const [lx, ly, lr] = boil(100 + i, e, .8), pop = i === shown - 1 ? 1.08 : 1; ctx.save(); ctx.translate(x + w / 2 + lx, 420 + ly); ctx.rotate(lr); ctx.scale(pop, pop); ctx.fillText(TEXT[i], -w / 2, 0); ctx.restore(); }
        x += w;
      }
      ctx.shadowColor = 'transparent';
    }
  },

  cam(st) { const k = eo(st / DUR); return { x: W / 2 + k * 60, y: H / 2 - k * 20, z: 1 + k * .06 }; },

  // 악보는 데이터: 글자가 놓일 때마다 종이 소리, 마지막에 종
  score() {
    const ev = [];
    for (let i = 0; i < TEXT.length; i++) if (TEXT[i] !== ' ') ev.push({ t: T_TEXT + i * PER, k: 'tick', v: .35, f: 3000 + (i % 3) * 500, pan: (i / TEXT.length - .5) * .8 });
    ev.push({ t: T_TEXT + TEXT.length * PER + .1, k: 'chime', n: 'E6', v: .25 }, { t: T_TEXT + TEXT.length * PER + .35, k: 'chime', n: 'B6', v: .18 });
    return ev;
  },

  poke(x, y) {
    const b = this.b;
    if (Math.hypot(x - b.x, y - (b.y - BR)) > BR * 1.4) return false;
    b.hold = 0; b.vy = -1500; b.vx += (b.x - x) * 10 + 120; b.y = Math.min(b.y, FLOOR - 1);
    sfx({ k: 'tok', v: .7, pan: b.x / W * 2 - 1 });
    return true;
  },
};
