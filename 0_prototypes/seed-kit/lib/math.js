// 수학 · 이징 · 시드 난수 — 결정론을 위해 Math.random 은 쓰지 않는다
export const TAU = Math.PI * 2, PI = Math.PI;
export const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
export const smooth = (a, b, x) => { x = inv(a, b, x); return x * x * (3 - 2 * x); };
export const eo = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const eio = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

// 시드 난수 생성기 (mulberry32)
export const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// 좌표 해시 → [0,1)
export const hash = (a, b = 0, c = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 7919, 668265263) ^ Math.imul((c | 0) + 104729, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

// 보일(boil): 퍼펫을 손으로 다시 놓을 때의 떨림. 노출 번호 e 마다 [dx, dy, rot]
export const boil = (id, e, amt = 1) => [(hash(id, e, 1) - .5) * 3 * amt, (hash(id, e, 2) - .5) * 3 * amt, (hash(id, e, 3) - .5) * .02 * amt];
