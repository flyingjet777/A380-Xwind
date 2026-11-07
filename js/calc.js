// A380 Takeoff Crosswind Envelope — calculation core
// Rules (Captain Cho, 2026-11-06):
//  - Verdict uses STEADY wind only. Gust components are reference only.
//  - Components rounded half-up to 0.1 kt BEFORE the verdict.
//  - Tailwind 10.0 kt = NO GO (strict <). Crosswind at limit = GO (<=).
//  - Runway heading MAG. Wind MAG by default (ATIS); TRUE option converts with VAR.
// All verdict arithmetic is done in integer tenths of a knot to avoid float error.

const EPS = 1e-9;

/** Round half-up to integer tenths of a knot (returns integer, e.g. 9.95 -> 100). */
export function toTenths(kt) {
  return Math.floor(kt * 10 + 0.5 + EPS);
}

/** Normalize an angle to (-180, 180]. */
export function norm180(deg) {
  let a = ((deg % 360) + 360) % 360;
  return a > 180 ? a - 360 : a;
}

/** TRUE -> MAG. varDeg: East +, West -. */
export function trueToMag(trueDeg, varDeg) {
  return ((trueDeg - varDeg) % 360 + 360) % 360;
}

/** Raw components. Returns { hw, xw, side } — hw > 0 headwind, < 0 tailwind. */
export function components(rwyMagHdg, windMagDir, speedKt) {
  const theta = norm180(windMagDir - rwyMagHdg) * Math.PI / 180;
  const hw = speedKt * Math.cos(theta);
  const xwSigned = speedKt * Math.sin(theta); // + = from right
  return { hw, xw: Math.abs(xwSigned), side: xwSigned > EPS ? 'R' : xwSigned < -EPS ? 'L' : '' };
}

/** Crosswind limit in tenths for a given tailwind (tenths), floored (conservative). */
export function xwLimitTenths(engine, twTenths, tailwindLimitKt = 10) {
  const xwMax = engine.xwMaxKt * 10;
  if (twTenths <= 0) return xwMax;
  const xwAtTw = engine.xwAtTailwindLimitKt * 10;
  const twLim = tailwindLimitKt * 10;
  return Math.floor((xwMax * twLim - (xwMax - xwAtTw) * twTenths) / twLim);
}

/** Verdict on already-rounded components (tenths). */
export function judge(engine, xwTenths, twTenths, tailwindLimitKt = 10) {
  const limit = xwLimitTenths(engine, twTenths, tailwindLimitKt);
  const twOk = twTenths < tailwindLimitKt * 10;          // 10.0 kt = NO GO
  const xwOk = xwTenths <= limit;                         // at limit = GO
  return { go: twOk && xwOk, twOk, xwOk, xwLimitTenths: limit };
}

/** Full evaluation from pilot inputs. */
export function evaluate({ engine, rwyMagHdg, windDir, windSpd, gustSpd = null,
                           windRef = 'MAG', varDeg = 0, tailwindLimitKt = 10 }) {
  const windMag = windRef === 'TRUE' ? trueToMag(windDir, varDeg) : windDir;

  const c = components(rwyMagHdg, windMag, windSpd);
  const hwT = toTenths(Math.max(0, c.hw));
  const twT = toTenths(Math.max(0, -c.hw));
  const xwT = toTenths(c.xw);
  const v = judge(engine, xwT, twT, tailwindLimitKt);

  let gust = null;
  if (gustSpd != null && gustSpd > windSpd) {
    const g = components(rwyMagHdg, windMag, gustSpd);
    gust = { hw: toTenths(Math.max(0, g.hw)) / 10, tw: toTenths(Math.max(0, -g.hw)) / 10,
             xw: toTenths(g.xw) / 10 }; // reference only — never used for verdict
  }

  return {
    windMag,
    hw: hwT / 10, tw: twT / 10, xw: xwT / 10, side: c.side,
    xwLimit: v.xwLimitTenths / 10,
    go: v.go, twOk: v.twOk, xwOk: v.xwOk,
    maxWindKt: maxWind({ engine, rwyMagHdg, windMag, tailwindLimitKt }),
    gust,
  };
}

/** Highest integer steady wind (kt) from this MAG direction that is still GO. */
export function maxWind({ engine, rwyMagHdg, windMag, tailwindLimitKt = 10 }) {
  let last = 0;
  for (let v = 1; v <= 99; v++) {
    const c = components(rwyMagHdg, windMag, v);
    const r = judge(engine, toTenths(c.xw), toTenths(Math.max(0, -c.hw)), tailwindLimitKt);
    if (!r.go) break;
    last = v;
  }
  return last; // 99 means "no limit within 99 kt" (pure headwind)
}

/**
 * Parse scratchpad wind entry. Accepts:
 *   170/30, 170/30G35, 17030, 17030G35 (METAR style, 3-digit dir + 2-digit speed),
 *   0805, 0805G15 (2-digit dir in tens + 2-digit speed -> 080/05),
 *   170 (direction only), /30 (speed only, keeps direction; clears gust).
 * prev = { wdir, wspd, gust } current values. Returns { wdir, wspd, gust } or { error }.
 */
export function parseWind(sp, prev = {}) {
  const s = String(sp || '').trim().toUpperCase();
  if (!s) return { error: '' };
  const metar = s.match(/^(\d{3})(\d{2})(?:G(\d{2}))?$/);
  const short = s.match(/^(\d{2})(\d{2})(?:G(\d{2}))?$/);   // 0805 -> 080/05 (direction in tens)
  const m = metar ? [s, metar[1], metar[2], metar[3]]
          : short ? [s, String(+short[1] * 10), short[2], short[3]]
          : s.match(/^(\d{1,3})?(?:\/(\d{1,2})(?:G(\d{1,2}))?)?$/);
  if (!m || (m[1] == null && m[2] == null)) return { error: 'FORMAT ERROR' };
  const d = m[1] != null ? +m[1] : prev.wdir, v = m[2] != null ? +m[2] : prev.wspd;
  if (d == null || v == null) return { error: 'FORMAT ERROR' };
  if (d > 360 || (d === 0 && v > 0)) return { error: 'ENTRY OUT OF RANGE' };
  const g = m[3] != null ? +m[3] : (m[2] != null ? null : (prev.gust ?? null));
  if (g != null && g <= v) return { error: 'ENTRY OUT OF RANGE' };
  return { wdir: d, wspd: v, gust: g };
}
