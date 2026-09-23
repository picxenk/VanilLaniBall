// 씬 2 · Yes, It is a game! — 글자가 한 자씩 바뀌고, 선반이 미끄러져 들어와 골대가 그 위로 올라간다.
import { makeScene } from '../game/scene.js';

export default makeScene({
  name: 'game', dur: 7, seed: 21,
  prevText: 'Hello, Ball', text: 'Yes, It is a game!',
  palette: { wallTop: '#7a5a6a', wallBottom: '#4a3444', floorTop: '#46384a', floorBottom: '#2e2432', ball: '#cf4b40', brick: '#c86a47' },
  ball: { r: 70, x: 200, y: -100, vx: 250, vy: 0 },
  goal: { x: 1560, y: 320, w: 230, h: 250, from: { dx: -80, dy: 330 }, at: [.5, 1.3] },   // 씬 1 의 자리(1480, 650)에서 출발
  obstacles: [{ kind: 'shelf', x: 1520, y: 570, w: 420, h: 36, from: { dx: 600 }, at: [.3, 1.0] }],
  cam: { x: 960, y: 540, z: 1 },
});
