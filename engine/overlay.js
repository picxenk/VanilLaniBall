// 엔진 오버레이 (화면 좌표): 골인했을 때만 Goal!
import { W, H } from './config.js';
import { stampText, lettersAt } from '../lib/draw.js';

const q = t => Math.floor(t * 12) / 12; // 오버레이도 스톱모션으로

export function overlay(ctx, game, e) {
  if (game.mode === 'goal') stampText(ctx, 'Goal!', W / 2, H / 2 + 60, { n: lettersAt(q(game.modeT) - .15), e, id: 700, size: 220, color: '#d8a54a' });
}
