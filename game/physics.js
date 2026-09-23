// 공 하나 vs 축정렬 사각형들 (바닥·벽·골대·장애물). 고정 dt, 난수 없음 → 결정론적.
//
// 공 상태 b = { x, y(중심), vx, vy, r, sq(찌그러짐 1=원), sqA(찌그러지는 법선 각), spin, hold, launch, contactT }
// "홀드": 세게 부딪히면 찌그러진 채 HOLD 초 동안 표면에 붙어 있다가 반사 속도로 튀어 나간다.
//         스톱모션(12포즈/초)에서도 접촉 프레임이 카메라에 잘 잡히게 하려는 애니메이션식 물리.
import { clamp } from '../lib/math.js';

const HOLD = .05, BOUNCE_MIN = 320, SUB = 4;

export function stepBall(b, dt, solids, G, emit, worldW = 1920) {
  b.contactT += dt;
  if (b.hold > 0) {
    b.hold -= dt; b.contactT = 0;
    if (b.hold <= 0) { b.vx = b.launch[0]; b.vy = b.launch[1]; }
  } else {
    const h = dt / SUB;
    sub: for (let k = 0; k < SUB; k++) {
      b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h;
      for (const r of solids) {
        const px = clamp(b.x, r.x, r.x + r.w), py = clamp(b.y, r.y, r.y + r.h), dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy;
        if (d2 >= b.r * b.r) continue;
        let nx, ny, pen;
        if (d2 > 1e-9) { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; pen = b.r - d; }
        else { // 중심이 사각형 안: 가장 얕은 축으로 밀어낸다
          const l = b.x - r.x, rt = r.x + r.w - b.x, t = b.y - r.y, bt = r.y + r.h - b.y, m = Math.min(l, rt, t, bt);
          [nx, ny] = m === t ? [0, -1] : m === bt ? [0, 1] : m === l ? [-1, 0] : [1, 0]; pen = m + b.r;
        }
        b.x += nx * pen; b.y += ny * pen;
        const vn = b.vx * nx + b.vy * ny;
        if (vn >= 0) continue;
        b.contactT = 0;
        const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty;
        if (-vn > BOUNCE_MIN) {                       // 튕김: 찌그러진 채 잠깐 머문다
          const lvn = -vn * (r.e ?? .64), lvt = vt * .9;
          b.launch = [nx * lvn + tx * lvt, ny * lvn + ty * lvt];
          b.sq = clamp(1 + vn / 5200, .55, 1); b.sqA = Math.atan2(ny, nx);
          b.hold = HOLD; b.vx = b.vy = 0;
          emit?.({ k: 'tok', v: clamp(-vn / 2400, .12, .9), pan: clamp(b.x / worldW * 2 - 1, -1, 1) });
          break sub;
        }
        let nvt = vt; if (ny < -.6) nvt *= Math.exp(-h * 1.8); // 위를 향한 면 위에선 굴림 마찰
        b.vx = tx * nvt; b.vy = ty * nvt;
      }
    }
  }
  if (b.hold <= 0) b.sq += (1 - b.sq) * (1 - Math.exp(-dt * 14));
  b.spin += b.vx * dt / b.r;
}

export const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
