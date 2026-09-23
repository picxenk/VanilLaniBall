// 씬 1 · Hello, Ball — 겉보기엔 seed-kit 그대로의 애니메이션. 공은 골대 조금 앞에서 멈춘다.
import { makeScene } from '../game/scene.js';

export default makeScene({
  name: 'hello', dur: 6, seed: 5,
  text: 'Hello, Ball', textAt: 1.25,
  palette: { wallTop: '#4f8b92', wallBottom: '#2f6369', floorTop: '#3d5257', floorBottom: '#2c3d41', ball: '#cf4b40', brick: '#c86a47' },
  ball: { r: 70, x: 180, y: 190, vx: 420, vy: 0 },
  goal: { x: 1480, y: 650, w: 230, h: 250 },
  cam: { x: 960, y: 540, z: 1 },
  pokeV: 900,                              // 톡 친 공이 튀어 오르는 세기 (첫 씬은 살살 → 쉽게)
  hint: { at: 3.4, text: 'tap the ball' },
});
