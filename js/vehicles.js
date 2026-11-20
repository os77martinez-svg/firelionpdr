// Perfiles de vehículos (frente hacia -X). Compartido por el 3D y los íconos.
// pts: perfil superior desde la parte baja trasera hasta la parte baja delantera.
export const VEHICLES = {
  sedan: {
    pts: [[2.35,.30],[2.41,.62],[2.30,.92],[1.55,1.00],[.95,1.40],[-.25,1.44],[-.95,1.00],[-2.20,.84],[-2.41,.56],[-2.35,.30]],
    rad: [.04,.12,.12,.12,.28,.30,.14,.18,.12,.04],
    wheels: [-1.42, 1.38], R: .36, c: .30, W: 1.60,
    belt: 1.0, hoodEnd: -.95, cabinEnd: 1.55, bF: -1.95, bR: 1.95, bH: .58,
    splits: [-.90, .20, 1.15], doors: 4, rear: 'trunk', pickup: 0,
    head: [-2.36, .70], tail: [2.34, .82]
  },
  coupe: {
    pts: [[2.30,.28],[2.37,.58],[2.26,.88],[1.30,.96],[.55,1.28],[-.30,1.31],[-1.05,.94],[-2.20,.78],[-2.39,.52],[-2.32,.28]],
    rad: [.04,.12,.12,.15,.30,.30,.14,.18,.12,.04],
    wheels: [-1.38, 1.32], R: .36, c: .28, W: 1.62,
    belt: .95, hoodEnd: -1.05, cabinEnd: 1.30, bF: -1.95, bR: 1.92, bH: .55,
    splits: [-.95, .55, 9], doors: 2, rear: 'trunk', pickup: 0,
    head: [-2.34, .66], tail: [2.30, .78]
  },
  suv: {
    pts: [[2.35,.42],[2.43,.72],[2.38,1.15],[2.24,1.72],[1.95,1.79],[-.55,1.81],[-1.20,1.22],[-2.25,1.08],[-2.43,.76],[-2.36,.42]],
    rad: [.04,.12,.10,.14,.16,.22,.12,.16,.14,.04],
    wheels: [-1.45, 1.45], R: .42, c: .42, W: 1.74,
    belt: 1.20, hoodEnd: -1.20, cabinEnd: 2.30, bF: -2.0, bR: 2.05, bH: .72,
    splits: [-1.05, .25, 1.35], doors: 4, rear: 'liftgate', pickup: 0,
    head: [-2.40, .96], tail: [2.40, 1.10]
  },
  minivan: {
    pts: [[2.45,.32],[2.51,.65],[2.46,1.15],[2.32,1.78],[2.0,1.85],[-.6,1.86],[-1.75,1.12],[-2.40,.95],[-2.51,.62],[-2.45,.32]],
    rad: [.04,.12,.10,.14,.18,.30,.14,.16,.12,.04],
    wheels: [-1.55, 1.50], R: .38, c: .32, W: 1.76,
    belt: 1.12, hoodEnd: -1.70, cabinEnd: 2.35, bF: -2.10, bR: 2.10, bH: .64,
    splits: [-1.40, -.35, 1.20], doors: 4, rear: 'liftgate', pickup: 0, sliding: true,
    head: [-2.47, .84], tail: [2.47, 1.15]
  },
  pickup: {
    pts: [[2.70,.46],[2.77,.78],[2.73,1.25],[.54,1.25],[.49,1.90],[-.80,1.92],[-1.38,1.30],[-2.55,1.18],[-2.77,.84],[-2.70,.46]],
    rad: [.04,.08,.04,.03,.10,.18,.10,.14,.12,.04],
    wheels: [-1.75, 1.68], R: .45, c: .46, W: 1.80,
    belt: 1.30, hoodEnd: -1.38, cabinEnd: .50, bF: -2.30, bR: 2.38, bH: .80,
    splits: [-1.25, -.32, .50], doors: 4, rear: 'tailgate', pickup: 1,
    head: [-2.74, 1.00], tail: [2.74, 1.05]
  }
};

export const ORDER = ['sedan', 'coupe', 'suv', 'minivan', 'pickup'];

// Zona por punto local y normal (debe coincidir con el shader).
export function zoneOf(v, p, n) {
  if (p.x < v.bF && p.y < v.bH) return 3;
  if (p.x > v.bR && p.y < v.bH) return 4;
  if (Math.abs(n.z) > 0.55) {
    const L = n.z > 0 ? 0 : 4;
    if (p.y > v.belt && p.x > v.hoodEnd && p.x < v.cabinEnd) return -1;
    let k;
    if (v.doors > 3) k = p.x < v.splits[0] ? 0 : p.x < v.splits[1] ? 1 : p.x < v.splits[2] ? 2 : 3;
    else k = p.x < v.splits[0] ? 0 : p.x < v.splits[1] ? 1 : 3;
    return 5 + L + k;
  }
  if (n.x < -0.55 && p.x < v.hoodEnd) return 3;
  if (n.x > 0.55) {
    if (p.x > v.bR - 0.35) return p.y > v.belt ? -1 : 2;
    return p.y > v.belt - 0.02 ? -1 : (v.pickup ? -2 : 2);
  }
  if (p.x < v.hoodEnd) return 0;
  if (p.x > v.cabinEnd) return v.pickup ? -2 : 2;
  if (n.y > 0.8) return 1;
  return -1;
}

// Silueta SVG para los botones selectores.
export function silhouettePath(type, w = 120, h = 52) {
  const v = VEHICLES[type];
  const xs = v.pts.map(p => p[0]);
  const minX = -2.8, maxX = 2.8, maxY = 2.0;
  const sx = w / (maxX - minX), sy = (h - 4) / maxY;
  const X = x => ((x - minX) * sx).toFixed(1);
  const Y = y => (h - 2 - y * sy).toFixed(1);
  let d = `M${X(v.pts[v.pts.length - 1][0])},${Y(v.c)}`;
  const [wf, wr] = v.wheels; const ar = v.R + .1;
  d += ` L${X(wf - ar)},${Y(v.c)} A${(ar*sx).toFixed(1)},${(ar*sy).toFixed(1)} 0 0 1 ${X(wf + ar)},${Y(v.c)}`;
  d += ` L${X(wr - ar)},${Y(v.c)} A${(ar*sx).toFixed(1)},${(ar*sy).toFixed(1)} 0 0 1 ${X(wr + ar)},${Y(v.c)}`;
  v.pts.forEach(p => { d += ` L${X(p[0])},${Y(p[1])}`; });
  d += ' Z';
  const wheel = x => `<circle cx="${X(x)}" cy="${Y(v.R)}" r="${(v.R*sy*.92).toFixed(1)}"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="sil-body" d="${d}"/><g class="sil-wheel">${wheel(wf)}${wheel(wr)}</g></svg>`;
}
