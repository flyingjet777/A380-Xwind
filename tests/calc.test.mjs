import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { judge, evaluate, toTenths, trueToMag, xwLimitTenths } from '../js/calc.js';

const env = JSON.parse(readFileSync(new URL('../data/envelopes.json', import.meta.url)));
const RR = env.engines.RR, EA = env.engines.EA;

test('XW 35.0 at TW 0 = GO, 35.1 = NO GO (both engines)', () => {
  for (const e of [RR, EA]) {
    assert.equal(judge(e, 350, 0).go, true);
    assert.equal(judge(e, 351, 0).go, false);
  }
});

test('TW 10.0 = NO GO even with zero crosswind; 9.9 = GO', () => {
  assert.equal(judge(RR, 0, 100).go, false);
  assert.equal(judge(RR, 0, 99).go, true);
});

test('Limit at TW 9.9: RR 29.0 (29.06 floored), EA 25.1', () => {
  assert.equal(xwLimitTenths(RR, 99), 290);
  assert.equal(xwLimitTenths(EA, 99), 251);
});

test('TW 5.0: RR limit 32.0, EA limit 30.0 — inclusive', () => {
  assert.equal(judge(RR, 320, 50).go, true);
  assert.equal(judge(RR, 321, 50).go, false);
  assert.equal(judge(EA, 300, 50).go, true);
  assert.equal(judge(EA, 301, 50).go, false);
});

test('RR TW 8.6 -> limit 29.84 floored to 29.8', () => {
  assert.equal(xwLimitTenths(RR, 86), 298);
});

test('Rounding half-up to 0.1', () => {
  assert.equal(toTenths(9.95), 100);
  assert.equal(toTenths(9.9499), 99);
  assert.equal(toTenths(35.04), 350);
  assert.equal(toTenths(35.05), 351);
});

test('Gust never changes verdict', () => {
  const base = { engine: RR, rwyMagHdg: 333, windDir: 250, windSpd: 30 };
  const a = evaluate(base), b = evaluate({ ...base, gustSpd: 45 });
  assert.equal(a.go, b.go);
  assert.ok(b.gust.xw > a.xw);
});

test('TRUE -> MAG: RKSI VAR 9W, 250T = 259M; KLAX VAR 12E, 250T = 238M', () => {
  assert.equal(trueToMag(250, -9), 259);
  assert.equal(trueToMag(250, 12), 238);
  assert.equal(trueToMag(355, -9), 4);
});

test('Same wind: RR GO, EA NO GO (wind 100/31, RWY 360)', () => {
  const w = { rwyMagHdg: 360, windDir: 100, windSpd: 31 };
  assert.equal(evaluate({ ...w, engine: RR }).go, true);
  assert.equal(evaluate({ ...w, engine: EA }).go, false);
});

test('Pure headwind has no limit within 99 kt', () => {
  assert.equal(evaluate({ engine: RR, rwyMagHdg: 333, windDir: 333, windSpd: 20 }).maxWindKt, 99);
});

test('Pure tailwind: max wind 9 kt (10 = NO GO)', () => {
  assert.equal(evaluate({ engine: RR, rwyMagHdg: 333, windDir: 153, windSpd: 5 }).maxWindKt, 9);
});

test('ENV points RKSI 334: RR L244/35 R064/35, corner L225/30 R083/30; EA corner 222/26', async () => {
  const { maxWind } = await import('../js/calc.js');
  const mw = (e, d) => maxWind({ engine: e, rwyMagHdg: 334, windMag: d });
  assert.equal(mw(RR, 244), 35); assert.equal(mw(RR, 64), 35);
  assert.equal(mw(RR, 225), 30); assert.equal(mw(RR, 83), 30);
  assert.equal(mw(EA, 222), 26); assert.equal(mw(EA, 86), 26);
});
