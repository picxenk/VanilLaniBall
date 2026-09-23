// 씬 3 · 더 멀리 — 카메라가 물러나며(공이 상대적으로 작아지고) 골대는 먼 바닥으로, 가운데 벽돌 벽이 솟는다.
import { makeScene } from '../game/scene.js';
import { FLOOR } from '../engine/config.js';

export default makeScene({
  name: 'far', dur: 10, seed: 37, worldW: 2560,
  prevText: 'Yes, It is a game!', text: 'A bit farther now.',
  palette: { wallTop: '#34566a', wallBottom: '#1b3342', floorTop: '#2e4450', floorBottom: '#1d2e36', ball: '#cf4b40', brick: '#c86a47' },
  ball: { r: 46, x: 150, y: 120, vx: 300, vy: 0 },
  goal: { x: 2240, y: FLOOR - 200, w: 190, h: 200, from: { dx: 1560 - 2240, dy: 320 - (FLOOR - 200) }, at: [.6, 1.6] }, // 씬 2 의 선반 위에서 출발
  obstacles: [
    { kind: 'shelf', x: 2700, y: 570, w: 420, h: 36, from: { dx: 1520 - 2700 }, at: [.2, .9] },                          // 선반은 퇴장
    { kind: 'brick', x: 1250, y: FLOOR - 340, w: 60, h: 340, from: { dy: 340 }, at: [1.2, 2.0] },                      // 벽이 바닥에서 솟는다
    { kind: 'brick', x: 1550, y: FLOOR - 600, w: 60, h: 540, from: { dy: 600 }, at: [1.2, 2.0] },     
  ],
  cam: { from: { x: 960, y: 540, z: 1 }, to: { x: 1280, y: 320, z: .75 }, at: [.2, 1.6] },
  wallRect: [-240, -640, 3100, 1840], floorRect: [-240, 3100, 700],
});
