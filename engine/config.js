// 필름(=게임) 규격 — 씬마다 길이(dur)만 다르고 나머지는 공유
export const W = 1920, H = 1080;   // 캔버스 해상도 (카메라 z=1 일 때 월드 1px = 화면 1px)
export const FPS = 60;             // 물리·시계 모두 고정 60Hz
export const EXPO = 5;             // 5프레임마다 한 포즈 = 12포즈/초 (스톱모션)
export const FLOOR = 900;          // 바닥 높이 (월드 y)
export const G = 3000;             // 중력 px/s²
