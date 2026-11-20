/* =========================================================
   CONFIGURACIÓN — edita aquí el teléfono y la zona de servicio
   ========================================================= */
const CONFIG = {
  phone: '+12146822089',          // número de Oscar
  phoneDisplay: '(214) 682-2089', // cómo se muestra en la página
  area: { es: '', en: '' }        // ← opcional, ej. { es: 'Atendemos Dallas–Fort Worth', en: 'Serving Dallas–Fort Worth' }
};

document.documentElement.classList.add("js");
import { VEHICLES, ORDER, silhouettePath } from './vehicles.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Idioma ---------- */
const T = {
  es: {
    vehicles: { sedan: 'Sedán', coupe: 'Coupé', suv: 'SUV', minivan: 'Minivan', pickup: 'Pickup' },
    panels: ['Cofre / capó', 'Techo', 'Cajuela', 'Defensa delantera', 'Defensa trasera',
      'Salpicadera del. izq.', 'Puerta del. izq.', 'Puerta tras. izq.', 'Costado tras. izq.',
      'Salpicadera del. der.', 'Puerta del. der.', 'Puerta tras. der.', 'Costado tras. der.'],
    rear: { trunk: 'Cajuela', liftgate: 'Compuerta trasera', tailgate: 'Compuerta de caja' },
    coupeDoor: ['Puerta izq.', 'Puerta der.'], sliding: ['Puerta corrediza izq.', 'Puerta corrediza der.'],
    bedside: ['Costado de caja izq.', 'Costado de caja der.'],
    damage: ['Granizo', 'Golpe de puerta', 'Abolladura', 'Pliegue', 'No estoy seguro'],
    count: n => n ? `${n} seleccionado${n > 1 ? 's' : ''}` : 'Ninguno',
    none: 'Toca los paneles en el modelo 3D o aquí',
    msg: (d) => `Hola Oscar${d.name ? ', soy ' + d.name : ''}. Me interesa una cotización de PDR.\n` +
      `Vehículo: ${d.vehicle}${d.model ? ' – ' + d.model : ''}\n` +
      (d.panels.length ? `Paneles: ${d.panels.join(', ')}\n` : '') +
      (d.damage.length ? `Tipo de daño: ${d.damage.join(', ')}\n` : '') + `Te envío fotos. ¡Gracias!`,
    sms: 'Hola Oscar, me interesa una cotización para reparar una abolladura. Te envío fotos.',
    lamp: 'LUZ DE LECTURA', rod: 'VARILLA PDR',
    stages: ['1 · Leer la abolladura', '2 · Empujar desde atrás', '3 · Pintura intacta'],
    model: 'Ej. 2021 Honda Odyssey', name: 'Tu nombre'
  },
  en: {
    vehicles: { sedan: 'Sedan', coupe: 'Coupe', suv: 'SUV', minivan: 'Minivan', pickup: 'Pickup' },
    panels: ['Hood', 'Roof', 'Trunk', 'Front bumper', 'Rear bumper',
      'Left front fender', 'Left front door', 'Left rear door', 'Left quarter panel',
      'Right front fender', 'Right front door', 'Right rear door', 'Right quarter panel'],
    rear: { trunk: 'Trunk', liftgate: 'Liftgate', tailgate: 'Tailgate' },
    coupeDoor: ['Left door', 'Right door'], sliding: ['Left sliding door', 'Right sliding door'],
    bedside: ['Left bed side', 'Right bed side'],
    damage: ['Hail', 'Door ding', 'Dent', 'Crease', 'Not sure'],
    count: n => n ? `${n} selected` : 'None',
    none: 'Tap panels on the 3D model or here',
    msg: (d) => `Hi Oscar${d.name ? ", this is " + d.name : ''}. I'd like a PDR quote.\n` +
      `Vehicle: ${d.vehicle}${d.model ? ' – ' + d.model : ''}\n` +
      (d.panels.length ? `Panels: ${d.panels.join(', ')}\n` : '') +
      (d.damage.length ? `Damage type: ${d.damage.join(', ')}\n` : '') + `I'll send photos. Thanks!`,
    sms: "Hi Oscar, I'd like a quote to repair a dent. I'll send photos.",
    lamp: 'READING LIGHT', rod: 'PDR ROD',
    stages: ['1 · Read the dent', '2 · Push from behind', '3 · Paint intact'],
    model: 'e.g. 2021 Honda Odyssey', name: 'Your name'
  }
};

let lang = 'es';
try { lang = localStorage.getItem('fl-lang') || (navigator.language || 'es').slice(0, 2); } catch (e) {}
if (!T[lang]) lang = 'en';

const telHref = () => `tel:${CONFIG.phone}`;
const smsHref = (body) => `sms:${CONFIG.phone}${/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(body)}`;

function applyLang(l) {
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem('fl-lang', l); } catch (e) {}
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === l));
  $$('[data-sms]').forEach(a => { a.href = smsHref(a.dataset['msg' + (l === 'es' ? 'Es' : 'En')] || T[l].sms); });
  $('#tLamp').textContent = T[l].lamp; $('#tRod').textContent = T[l].rod;
  $('#qModel').placeholder = T[l].model; $('#qName').placeholder = T[l].name;
  const area = CONFIG.area[l]; $('#areaLine').textContent = area || ''; $('#areaLine').style.display = area ? '' : 'none';
  renderQuoteUI();
}
$$('.lang button').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));
$$('[data-call]').forEach(a => { a.href = telHref(); });
$$('[data-phone-text]').forEach(a => { a.textContent = CONFIG.phoneDisplay; });
$('#yr').textContent = new Date().getFullYear();

/* ---------- Header / menú ---------- */
const header = $('header');
const onScroll = () => header.classList.toggle('scrolled', scrollY > 20);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const mm = $('#mmenu');
$('.burger').addEventListener('click', () => mm.classList.toggle('open'));
$$('#mmenu a').forEach(a => a.addEventListener('click', () => mm.classList.remove('open')));

/* ---------- Revelado al hacer scroll ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .14 });
$$('.rv').forEach(el => io.observe(el));
$$('.svc').forEach(c => c.addEventListener('pointermove', e => {
  const r = c.getBoundingClientRect(); c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
}));

/* ---------- Brasas en el hero ---------- */
(function embers() {
  const cv = $('#embers'); const ctx = cv.getContext('2d');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let W, H, parts = [], run = true;
  const resize = () => { W = cv.width = cv.offsetWidth * devicePixelRatio; H = cv.height = cv.offsetHeight * devicePixelRatio; };
  resize(); addEventListener('resize', resize);
  const N = innerWidth < 700 ? 40 : 80;
  const spawn = (p = {}) => Object.assign(p, { x: Math.random() * W, y: H + Math.random() * H * .3, r: (Math.random() * 2.2 + .6) * devicePixelRatio,
    vy: -(Math.random() * .9 + .35) * devicePixelRatio, vx: (Math.random() - .5) * .4, life: 0, max: 280 + Math.random() * 300, h: 8 + Math.random() * 30 });
  for (let i = 0; i < N; i++) { const p = spawn(); p.y = Math.random() * H; parts.push(p); }
  new IntersectionObserver(([e]) => { run = e.isIntersecting; if (run) requestAnimationFrame(tick); }).observe(cv);
  function tick(t) {
    if (!run) return;
    ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      p.life++; p.y += p.vy; p.x += p.vx + Math.sin((p.life + p.h * 10) / 40) * .35;
      const a = Math.max(0, 1 - p.life / p.max);
      if (a <= 0 || p.y < -20) spawn(p);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `hsla(${p.h},100%,65%,${a})`); g.addColorStop(1, `hsla(${p.h},100%,50%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 7); ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* ---------- Demo animada de PDR ---------- */
(function pdrDemo() {
  const svg = $('#demoSvg'); if (!svg) return;
  const panel = $('#panelPath'), rod = $('#rodG'), refl = $('#reflect'), stage = $('#demoStage');
  const lampL = $('#lampLines');
  for (let i = 0; i < 9; i++) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    Object.entries({ x: 134 + i * 30, y: 21, width: 14, height: 16, rx: 2, fill: 'url(#lamp)' }).forEach(([k, v]) => r.setAttribute(k, v));
    lampL.appendChild(r);
  }
  const Y0 = 160, X0 = 50, X1 = 470, CX = 260, TH = 14;
  const surf = (x, d) => Y0 + d * Math.exp(-Math.pow((x - CX) / 46, 2));
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(svg);
  const lines = [0, 1, 2].map(() => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#ffffff'); p.setAttribute('stroke-width', '2'); p.setAttribute('stroke-linecap', 'round'); refl.appendChild(p); return p; });
  function draw(d) {
    let top = '', bot = '';
    for (let x = X0; x <= X1; x += 6) top += (x === X0 ? 'M' : 'L') + x + ',' + surf(x, d).toFixed(2);
    for (let x = X1; x >= X0; x -= 6) bot += 'L' + x + ',' + (surf(x, d) + TH).toFixed(2);
    panel.setAttribute('d', top + bot + 'Z');
    lines.forEach((p, i) => {
      let s = ''; const off = 24 + i * 16;
      for (let x = 90; x <= 430; x += 5) {
        const dd = (surf(x + 2, d) - surf(x - 2, d)) / 4;
        s += (x === 90 ? 'M' : 'L') + x + ',' + (Y0 - off - dd * (14 + i * 8)).toFixed(2);
      }
      p.setAttribute('d', s); p.setAttribute('opacity', (0.5 - i * 0.12).toFixed(2));
    });
    rod.setAttribute('transform', `translate(${CX},${(surf(CX, d) + TH + 9).toFixed(2)})`);
  }
  let t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const c = ((now - t0) / 1000) % 7.5; let d, s;
    if (c < 1.6) { d = 42; s = 0; }
    else if (c < 5.2) { const k = (c - 1.6) / 3.6; d = 42 * (1 - k) + Math.sin(k * 40) * 2.2 * (1 - k); s = 1; }
    else { d = 0; s = 2; }
    stage.textContent = T[lang].stages[s];
    draw(Math.max(0, d));
  }
  draw(42); requestAnimationFrame(frame);
})();

/* ---------- Antes / Después ---------- */
(function beforeAfter() {
  const ba = $('#ba'), r = $('#baRange');
  const set = v => ba.style.setProperty('--pos', v + '%');
  r.addEventListener('input', () => set(r.value));
  let done = false;
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || done) return; done = true;
    const seq = [50, 18, 82, 50]; let i = 0; const start = performance.now();
    (function an(now) {
      const k = Math.min(1, (now - start) / 2400); const seg = k * (seq.length - 1); i = Math.min(seq.length - 2, Math.floor(seg));
      const f = seg - i; const e2 = f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      const v = seq[i] + (seq[i + 1] - seq[i]) * e2; set(v); r.value = v;
      if (k < 1) requestAnimationFrame(an);
    })(start);
  }, { threshold: .5 }).observe(ba);
})();

/* ---------- Cotizador 3D ---------- */
const state = { type: 'sedan', sel: new Set(), damage: new Set() };
let car = null;

function panelName(id, type = state.type) {
  const t = T[lang], v = VEHICLES[type];
  if (id === 2) return t.rear[v.rear];
  if (type === 'coupe' && (id === 6 || id === 10)) return t.coupeDoor[id === 6 ? 0 : 1];
  if (v.sliding && (id === 7 || id === 11)) return t.sliding[id === 7 ? 0 : 1];
  if (v.pickup && (id === 8 || id === 12)) return t.bedside[id === 8 ? 0 : 1];
  return t.panels[id];
}
function availablePanels(type = state.type) {
  const ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return VEHICLES[type].doors < 4 ? ids.filter(i => i !== 7 && i !== 11) : ids;
}

function buildMessage() {
  const t = T[lang];
  return t.msg({
    name: $('#qName').value.trim(), model: $('#qModel').value.trim(), vehicle: t.vehicles[state.type],
    panels: [...state.sel].sort((a, b) => a - b).map(i => panelName(i)),
    damage: [...state.damage].map(i => t.damage[i])
  });
}

function renderQuoteUI() {
  const t = T[lang];
  // tipos
  const qt = $('#qTypes');
  qt.innerHTML = ORDER.map(k => `<button class="q-type ${k === state.type ? 'on' : ''}" data-type="${k}">${silhouettePath(k)}<span>${t.vehicles[k]}</span></button>`).join('');
  $$('.q-type', qt).forEach(b => b.addEventListener('click', () => selectType(b.dataset.type)));
  // paneles
  const qp = $('#qPanels');
  qp.innerHTML = availablePanels().map(i => `<button class="chip ${state.sel.has(i) ? 'on' : ''}" data-id="${i}">${panelName(i)}</button>`).join('');
  $$('.chip', qp).forEach(b => b.addEventListener('click', () => {
    const id = +b.dataset.id;
    if (car) car.toggle(id); else { state.sel.has(id) ? state.sel.delete(id) : state.sel.add(id); renderQuoteUI(); }
  }));
  // daño
  const qd = $('#qDamage');
  qd.innerHTML = t.damage.map((d, i) => `<button class="chip ${state.damage.has(i) ? 'on' : ''}" data-i="${i}">${d}</button>`).join('');
  $$('.chip', qd).forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i; state.damage.has(i) ? state.damage.delete(i) : state.damage.add(i); renderQuoteUI();
  }));
  $('#qCount').textContent = t.count(state.sel.size);
  updateMessage();
}
function updateMessage() {
  const m = buildMessage();
  $('#qPreview').textContent = state.sel.size ? m : T[lang].none;
  $('#qSend').href = smsHref(m);
}
['#qModel', '#qName'].forEach(s => $(s).addEventListener('input', updateMessage));

function selectType(type) {
  if (type === state.type) return;
  state.type = type;
  if (VEHICLES[type].doors < 4) { state.sel.delete(7); state.sel.delete(11); }
  if (car) car.setVehicle(type);
  renderQuoteUI();
}
$('#qClear').addEventListener('click', () => { if (car) car.clear(); else { state.sel.clear(); renderQuoteUI(); } state.damage.clear(); renderQuoteUI(); });
$$('#qViews button').forEach(b => b.addEventListener('click', () => car && car.setView(b.dataset.view)));
$$('#qColors button').forEach(b => b.addEventListener('click', () => {
  $$('#qColors button').forEach(x => x.classList.remove('on')); b.classList.add('on'); car && car.setColor(b.dataset.c);
}));

const tip = $('#tip');
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
function fallback() { $('#qFallback').style.display = 'grid'; $('.q-hint').style.display = 'none'; $('#qViews').style.display = 'none'; $('#qColors').style.display = 'none'; }

// carga el 3D sólo cuando el cotizador se acerca a la pantalla
const qio = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return; qio.disconnect();
  if (!webglOK()) return fallback();
  const pre = [...state.sel];
  import('./car3d.js').then(({ initCar }) => {
    car = initCar($('#car3d'), {
      onChange(sel, type) {
        state.sel = new Set(sel); renderQuoteUI();
      },
      onHover(z, e) {
        if (z >= 0 && e) { tip.textContent = panelName(z); tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.style.opacity = 1; }
        else tip.style.opacity = 0;
      }
    });
    pre.forEach(id => car.toggle(id));
  }).catch(err => { console.error(err); fallback(); });
}, { rootMargin: '400px' });
qio.observe($('#cotizador'));

applyLang(lang);
