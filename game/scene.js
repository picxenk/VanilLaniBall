// 씬 팩토리: 설정(cfg) 한 장 → seed-kit 의 샷 계약 + 게임 계약을 구현한 객체.
//
// 샷 계약   build · reset · step(dt, st, sf) · snap · draw(ctx, sq, e, cam) · cam(st) · score()
// 게임 계약 dur(초) · hit(x, y) → dx | null · poke(dx) · goalF(골이 들어간 프레임 | null) · overlay(ctx, sq, e)
//
// 소품(골대·장애물)은 { x, y, w, h, from: {dx, dy}, at: [t0, t1] } — at 구간 동안 from 오프셋에서 제자리로 이동.
// 물리는 st(연속 시각)로, 그림은 sq(스냅된 포즈 시각)로 위치를 구하므로 소품도 스톱모션으로 "뚝뚝" 움직인다.
import { W, H, FPS, FLOOR, G } from '../engine/config.js';
import { TAU, PI, clamp, lerp, inv, eio, hash, boil } from '../lib/math.js';
import { g2, put, backdrop, setCam, stampText, lettersAt } from '../lib/draw.js';
import { emit } from '../engine/sound.js';
import { stepBall, inRect } from './physics.js';
import { makeBall, makeGoal, makeBrick, makeShelf } from './props.js';

const PER = 1 / 12, grid = t => Math.ceil(t * 12 - 1e-6) / 12;  // 노출 격자에 맞춘 시각
const POOF = .45;                                                // 골인 후 공이 종이 조각으로 터지기까지
const TY = 250;                                                  // 제목 글자 기준선 (화면 좌표)
const CONFETTI = ['#cf4b40', '#efe8d6', '#d8a54a', '#8aaeb3'];

const place = (p, t) => { const k = p.at ? eio(inv(p.at[0], p.at[1], t)) : 1, f = p.from ?? {}; return { x: p.x + (f.dx ?? 0) * (1 - k), y: p.y + (f.dy ?? 0) * (1 - k), w: p.w, h: p.h, kind: p.kind }; };
const lerpCam = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });

export function makeScene(cfg) {
  const P = cfg.prevText ?? '', T = cfg.text, pal = cfg.palette, worldW = cfg.worldW ?? W;
  const outAt = grid(.25), inAt = P ? grid(outAt + P.length * PER + .2) : grid(cfg.textAt ?? 1.25);
  const wallR = cfg.wallRect ?? [-120, -80, W + 240, H + 160], floorR = cfg.floorRect ?? [-120, W + 240, H - FLOOR + 160];

  return {
    name: cfg.name, dur: cfg.dur, cfg,

    build() {
      this.ball = makeBall(cfg.ball.r, pal.ball);
      this.goalSp = makeGoal(cfg.goal.w, cfg.goal.h);
      this.obSp = (cfg.obstacles ?? []).map((o, i) => o.kind === 'shelf' ? makeShelf(o.w, o.h) : makeBrick(o.w, o.h, 11 + i, pal.brick));
      this.wall = backdrop(wallR[2], wallR[3], { top: pal.wallTop, bottom: pal.wallBottom, seed: cfg.seed ?? 5, mottle: .35, dust: wallR[2] * wallR[3] / 1500 });
      this.floor = backdrop(floorR[1], floorR[2], { top: pal.floorTop, bottom: pal.floorBottom, seed: (cfg.seed ?? 5) + 4, mottle: .6 });
      const g = g2(this.floor); g.fillStyle = 'rgba(231,222,200,.28)'; g.fillRect(0, 0, floorR[1], 3);
    },

    // 충돌 사각형: 바닥 + 좌우 벽 + 장애물 + 골대(크로스바·뒤 기둥). 앞 기둥은 깊이상 앞이라 통과.
    solids(t) {
      const L = [{ x: -3000, y: FLOOR, w: 9000, h: 3000, e: .64 }, { x: -600, y: -6000, w: 600, h: 12000 }, { x: worldW, y: -6000, w: 600, h: 12000 }];
      for (const o of cfg.obstacles ?? []) L.push(place(o, t));
      const g = place(cfg.goal, t);
      L.push({ x: g.x - 8, y: g.y - 16, w: g.w + 16, h: 18, e: .5 }, { x: g.x + g.w - 14, y: g.y - 16, w: 20, h: g.h + 16, e: .3 });
      return L;
    },
    zone(t) { const g = place(cfg.goal, t), r = cfg.ball.r; return { x: g.x + r * .3, y: g.y + r * .3, w: g.w - 14 - r * .3, h: g.h - r * .3 }; },

    reset() {
      const c = cfg.ball;
      this.b = { x: c.x, y: c.y, vx: c.vx ?? 0, vy: c.vy ?? 0, r: c.r, sq: 1, sqA: -PI / 2, spin: 0, hold: 0, launch: null, contactT: 9 };
      this.goalF = null; this.pokes = 0; this.snap();
    },
    // 톡 치기 (seed-kit 그대로): 보이는 공(스냅 포즈)을 눌렀는지 → 누른 자리의 반대쪽으로 튕겨 오른다.
    // 반환값 dx = 공 중심에서 누른 점까지의 가로 오프셋(반지름 단위). 입력 로그에는 이 값만 남긴다.
    hit(x, y) {
      const b = this.b;
      if (this.goalF != null || Math.hypot(x - b.rx, y - b.ry) > b.r * 1.4) return null;
      return clamp((b.rx - x) / b.r, -1.4, 1.4);
    },
    poke(dx) {
      const b = this.b;
      b.hold = 0; b.launch = null; b.vy = -(cfg.pokeV ?? 1500); b.vx += dx * 700 + 120; b.y -= 2; this.pokes++;
      emit({ k: 'tok', v: .7, pan: clamp(b.x / worldW * 2 - 1, -1, 1) });
    },

    step(dt, st, sf) {
      const b = this.b;
      if (this.goalF == null || st < this.goalF / FPS + POOF) stepBall(b, dt, this.solids(st), G, emit, worldW);
      if (this.goalF == null && inRect(b.x, b.y, this.zone(st))) { this.goalF = sf; emit({ k: 'swish' }); }
      if (this.goalF != null && sf === this.goalF + Math.round(POOF * FPS)) emit({ k: 'pop' });
    },
    snap() { const b = this.b; b.rx = b.x; b.ry = b.y; b.rsq = b.sq; b.rsqA = b.sqA; b.rspin = b.spin; },

    cam(st) {
      const c = cfg.cam, base = c.from ? lerpCam(c.from, c.to, eio(inv(c.at[0], c.at[1], st))) : c;
      return { x: base.x + Math.sin(st * .5) * 8, y: base.y + Math.sin(st * .37) * 5, z: base.z };
    },

    draw(ctx, sq, e, cam) {
      setCam(ctx, cam, .85); ctx.drawImage(this.wall, wallR[0], wallR[1]);
      setCam(ctx, cam, 1);
      (cfg.obstacles ?? []).forEach((o, i) => { const p = place(o, sq), [bx, by] = boil(200 + i, e, .5); put(ctx, this.obSp[i], p.x + bx, p.y + by); });
      ctx.drawImage(this.floor, floorR[0], FLOOR);
      const g = place(cfg.goal, sq), [gx, gy] = boil(300, e, .5);
      put(ctx, this.goalSp.back, g.x + gx, g.y + gy);

      const b = this.b, r = b.r, poofT = this.goalF == null ? Infinity : this.goalF / FPS + POOF;
      if (sq < poofT) {
        // 그림자: 공 아래에서 가장 가까운 윗면에 떨어진다
        let sy = Infinity; for (const s of this.solids(sq)) if (b.rx >= s.x && b.rx <= s.x + s.w && s.y >= b.ry - 2 && s.y < sy) sy = s.y;
        const hgt = clamp((sy - b.ry - r) / 600, 0, 1);
        if (sy < Infinity && hgt < 1) { ctx.fillStyle = `rgba(6,20,24,${.34 - hgt * .24})`; ctx.beginPath(); ctx.ellipse(b.rx + 8, sy + 3, r * (1.1 - hgt * .4), r * .16, 0, 0, TAU); ctx.fill(); }
        // 공: 접촉점 기준으로 법선 방향 찌그러짐 (부피 보존), 그 위에 퍼펫 자체 회전
        const [bx, by, br] = boil(1, e), nx = Math.cos(b.rsqA), ny = Math.sin(b.rsqA), s = b.rsq, th = Math.atan2(nx, -ny);
        ctx.save(); ctx.translate(b.rx + bx - nx * r, b.ry + by - ny * r); ctx.rotate(th); ctx.scale(1 / Math.sqrt(s), s); ctx.translate(0, -r); ctx.rotate(-th);
        put(ctx, this.ball, 0, 0, { rot: b.rspin + br }); ctx.restore();
      } else this.drawConfetti(ctx, sq - poofT, b.rx, b.ry, r);
      put(ctx, this.goalSp.front, g.x + gx, g.y + gy);

      if (cfg.hint && this.pokes === 0 && sq > cfg.hint.at) { // 첫 씬: 공이 멈춘 뒤에야 슬쩍
        ctx.save(); ctx.font = 'italic 38px ui-serif, Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#efe8d6'; ctx.globalAlpha = .55 + .25 * (e % 2);
        ctx.fillText(cfg.hint.text, b.rx, b.ry - r - 50); ctx.restore();
      }
    },

    drawConfetti(ctx, t, x, y, r) {
      if (t > 1.6) return;
      for (let i = 0; i < 26; i++) {
        const a = hash(i, 1) * TAU, v = 300 + hash(i, 2) * 700, vx = Math.cos(a) * v, vy = Math.sin(a) * v - 500, gg = G * .45;
        const px = x + vx * t * (1 - t * .25), py = y + vy * t + .5 * gg * t * t, s = r * (.14 + hash(i, 3) * .16);
        ctx.save(); ctx.globalAlpha = clamp(1.6 - t, 0, 1); ctx.translate(px, Math.min(py, FLOOR - 4)); ctx.rotate(hash(i, 4) * TAU + t * (hash(i, 5) - .5) * 14);
        ctx.fillStyle = CONFETTI[i % CONFETTI.length]; ctx.fillRect(-s, -s * .6, s * 2, s * 1.2); ctx.restore();
      }
    },

    // 화면 좌표 제목: 이전 씬의 글자가 한 노출에 한 자씩 빠지고, 새 글자가 한 자씩 놓인다
    overlay(ctx, sq, e) {
      if (P) { const n = P.length - lettersAt(sq - outAt); if (n > 0) stampText(ctx, P, W / 2, TY, { n, e, id: 100, size: 120 }); }
      stampText(ctx, T, W / 2, TY, { n: lettersAt(sq - inAt), e, id: 300, size: 120 });
    },

    score() {
      const ev = [];
      for (let i = 0; i < P.length; i++) if (P[P.length - 1 - i] !== ' ') ev.push({ t: outAt + i * PER, k: 'tick', v: .22, f: 2200 });
      for (let i = 0; i < T.length; i++) if (T[i] !== ' ') ev.push({ t: inAt + i * PER, k: 'tick', v: .35, f: 3000 + (i % 3) * 500, pan: (i / T.length - .5) * .8 });
      for (const p of [cfg.goal, ...(cfg.obstacles ?? [])]) if (p.at) ev.push({ t: p.at[0], k: 'whoosh', v: .22, dur: p.at[1] - p.at[0] }, { t: p.at[1], k: 'thud', v: .35 });
      return ev;
    },
  };
}
