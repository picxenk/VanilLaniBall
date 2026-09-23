// 필름 규격 — 모든 모듈이 공유하는 유일한 상수 모음
export const W = 1920, H = 1080;   // 캔버스(월드) 해상도
export const FPS = 60, DUR = 4;    // 60fps · 4초
export const NF = FPS * DUR;       // 총 프레임 수
export const EXPO = 5;             // 5프레임마다 한 포즈 = 12포즈/초 (스톱모션)
