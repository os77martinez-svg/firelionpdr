import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VEHICLES, zoneOf } from './vehicles.js';

const BEVEL_T = 0.1, BEVEL_S = 0.06;

function roundedProfile(v) {
  const s = new THREE.Shape();
  const [wf, wr] = v.wheels; const ar = v.R + 0.1 + BEVEL_S;
  const front = v.pts[v.pts.length - 1];
  s.moveTo(front[0], v.c);
  s.lineTo(wf - ar, v.c);
  s.absarc(wf, v.R, ar, Math.PI, 0, true);
  s.lineTo(wr - ar, v.c);
  s.absarc(wr, v.R, ar, Math.PI, 0, true);
  // perfil superior con esquinas redondeadas
  const P = v.pts;
  for (let i = 0; i < P.length; i++) {
    const p = P[i], r = v.rad[i] || 0;
    if (i === 0 || i === P.length - 1 || r <= 0) { s.lineTo(p[0], p[1]); continue; }
    const a = P[i - 1], b = P[i + 1];
    const d1 = [a[0] - p[0], a[1] - p[1]], d2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(...d1), l2 = Math.hypot(...d2);
    const rr = Math.min(r, l1 * 0.45, l2 * 0.45);
    s.lineTo(p[0] + d1[0] / l1 * rr, p[1] + d1[1] / l1 * rr);
    s.quadraticCurveTo(p[0], p[1], p[0] + d2[0] / l2 * rr, p[1] + d2[1] / l2 * rr);
  }
  s.closePath();
  return s;
}

function buildBodyGeometry(v) {
  const geo = new THREE.ExtrudeGeometry(roundedProfile(v), {
    depth: v.W, bevelEnabled: true, bevelThickness: BEVEL_T, bevelSize: BEVEL_S,
    bevelSegments: 6, curveSegments: 18, steps: 1
  });
  geo.translate(0, 0, -v.W / 2);
  const pos = geo.attributes.position;
  const roofTop = Math.max(...v.pts.map(p => p[1]));
  const half = Math.max(...v.pts.map(p => Math.abs(p[0])));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i); let z = pos.getZ(i);
    if (y > v.belt) z *= 1 - 0.15 * Math.min(1, (y - v.belt) / (roofTop - v.belt));
    z *= 1 - 0.07 * Math.pow(Math.abs(x) / half, 4);
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

const ZONE_GLSL = /* glsl */`
uniform float uBelt,uHoodEnd,uCabinEnd,uBF,uBR,uBH,uS1,uS2,uS3,uDoors,uPickup,uTime,uHover;
uniform float uSel[13];
varying vec3 vLP; varying vec3 vLN;
float zoneOf(vec3 p, vec3 n){
  if (p.x < uBF && p.y < uBH) return 3.;
  if (p.x > uBR && p.y < uBH) return 4.;
  if (abs(n.z) > 0.55) {
    float L = n.z > 0. ? 0. : 4.;
    if (p.y > uBelt && p.x > uHoodEnd && p.x < uCabinEnd) return -1.;
    float k;
    if (uDoors > 3.) k = p.x < uS1 ? 0. : (p.x < uS2 ? 1. : (p.x < uS3 ? 2. : 3.));
    else k = p.x < uS1 ? 0. : (p.x < uS2 ? 1. : 3.);
    return 5. + L + k;
  }
  if (n.x < -0.55 && p.x < uHoodEnd) return 3.;
  if (n.x > 0.55) {
    if (p.x > uBR - 0.35) return p.y > uBelt ? -1. : 2.;
    return p.y > uBelt - 0.02 ? -1. : (uPickup > .5 ? -2. : 2.);
  }
  if (p.x < uHoodEnd) return 0.;
  if (p.x > uCabinEnd) return uPickup > .5 ? -2. : 2.;
  if (n.y > 0.8) return 1.;
  return -1.;
}
float seam(float d){ return smoothstep(0.006, 0.016, d); }
`;

function makeBodyMaterial(uniforms) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xf2f2f0, metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = 'varying vec3 vLP; varying vec3 vLN;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n vLP = transformed; vLN = objectNormal;');
    sh.fragmentShader = ZONE_GLSL + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 gN = normalize(vLN);
        float gZone = zoneOf(vLP, gN);
        int gZi = int(gZone + 0.5);
        float gSel = gZone > -0.5 ? uSel[gZi] : 0.;
        float gHov = (gZone > -0.5 && abs(uHover - gZone) < 0.5) ? 1. : 0.;
        vec3 col = diffuseColor.rgb;
        if (gZone < -1.5) col = vec3(0.035);
        else if (gZone < -0.5) col = vec3(0.015, 0.02, 0.026);
        else {
          if (abs(gN.z) > 0.55 && vLP.y < uBelt) {
            float s = seam(abs(vLP.x - uS1)) * seam(abs(vLP.x - uS2));
            if (uDoors > 3.) s *= seam(abs(vLP.x - uS3));
            s *= seam(abs(vLP.x - uBF)) * seam(abs(vLP.x - uBR));
            col *= mix(0.12, 1.0, s);
            float hy = uBelt - 0.15;
            if (abs(vLP.y - hy) < 0.025) {
              float hx2 = uS2 - 0.23; float hx3 = uS3 - 0.23;
              if (abs(vLP.x - hx2) < 0.09 || (uDoors > 3. && abs(vLP.x - hx3) < 0.09)) col *= 0.35;
            }
          }
          if (vLP.x < uBF || vLP.x > uBR) col *= mix(0.12, 1.0, seam(abs(vLP.y - uBH)));
          col = mix(col, vec3(0.7, 0.015, 0.01), gSel * 0.88);
        }
        diffuseColor.rgb = col;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        if (gZone < -0.5 && gZone > -1.5) { roughnessFactor = 0.04; metalnessFactor = 0.2; }
        if (gZone < -1.5) { roughnessFactor = 0.9; metalnessFactor = 0.0; }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.06, 0.02) * (gSel * (0.28 + 0.16 * sin(uTime * 3.2)) + gHov * 0.25);`);
  };
  return mat;
}

function makeWheel(v, side) {
  const g = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.25 });
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(v.R, v.R, 0.3, 40), tireMat);
  tire.rotation.x = Math.PI / 2; g.add(tire);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(v.R * 0.86, v.R * 0.14, 12, 40), tireMat);
  torus.position.z = side * 0.14; g.add(torus);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(v.R * 0.66, v.R * 0.66, 0.31, 36), rimMat);
  rim.rotation.x = Math.PI / 2; g.add(rim);
  const spin = new THREE.Group(); g.add(spin);
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(v.R * 0.12, v.R * 1.15, 0.04), rimMat);
    sp.position.z = side * 0.16; sp.rotation.z = i * Math.PI * 2 / 5; spin.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(v.R * 0.16, v.R * 0.16, 0.05, 20),
    new THREE.MeshStandardMaterial({ color: 0xd40d0d, metalness: .6, roughness: .3 }));
  hub.rotation.x = Math.PI / 2; hub.position.z = side * 0.18; spin.add(hub);
  const dark = new THREE.Mesh(new THREE.CircleGeometry(v.R * 0.6, 32), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  dark.position.z = side * 0.157; if (side < 0) dark.rotation.y = Math.PI; g.add(dark);
  g.userData.spin = spin;
  return g;
}

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function initCar(container, { onChange, onHover } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(-5.6, 2.7, 6.4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.8, 0);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 4.5; controls.maxDistance = 13;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.9;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-4, 7, 5); scene.add(key);
  const rimL = new THREE.DirectionalLight(0xff3020, 0.9); rimL.position.set(5, 2, -6); scene.add(rimL);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x220000, 0.5));

  // Piso tipo "turntable" de taller
  const floor = new THREE.Group(); scene.add(floor);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.4, 96),
    new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.3, roughness: 0.7 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -0.002; floor.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.35, 4.45, 128),
    new THREE.MeshBasicMaterial({ color: 0xff1a0a, transparent: true, opacity: 0.85 }));
  ring.rotation.x = -Math.PI / 2; floor.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.62, 128, 1, 0, Math.PI * 1.2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 }));
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.001; floor.add(ring2);

  const carGroup = new THREE.Group(); scene.add(carGroup);
  const shadowTex = shadowTexture();

  const uniforms = {
    uBelt: { value: 1 }, uHoodEnd: { value: 0 }, uCabinEnd: { value: 0 }, uBF: { value: 0 }, uBR: { value: 0 },
    uBH: { value: 0 }, uS1: { value: 0 }, uS2: { value: 0 }, uS3: { value: 0 }, uDoors: { value: 4 },
    uPickup: { value: 0 }, uTime: { value: 0 }, uHover: { value: -10 }, uSel: { value: new Array(13).fill(0) }
  };
  const bodyMat = makeBodyMaterial(uniforms);
  let body = null, wheels = [], current = null, vtype = 'sedan';
  const selected = new Set();

  function setUniforms(v) {
    Object.assign(uniforms.uBelt, { value: v.belt }); uniforms.uHoodEnd.value = v.hoodEnd;
    uniforms.uCabinEnd.value = v.cabinEnd; uniforms.uBF.value = v.bF; uniforms.uBR.value = v.bR;
    uniforms.uBH.value = v.bH; uniforms.uS1.value = v.splits[0]; uniforms.uS2.value = v.splits[1];
    uniforms.uS3.value = v.splits[2]; uniforms.uDoors.value = v.doors; uniforms.uPickup.value = v.pickup;
  }

  function buildCar(type) {
    while (carGroup.children.length) {
      const o = carGroup.children.pop();
      o.traverse(n => { if (n.geometry) n.geometry.dispose(); });
    }
    const v = VEHICLES[type]; current = v; vtype = type;
    setUniforms(v);
    body = new THREE.Mesh(buildBodyGeometry(v), bodyMat);
    carGroup.add(body);
    wheels = [];
    const zw = v.W / 2 - 0.02;
    for (const x of v.wheels) for (const side of [1, -1]) {
      const w = makeWheel(v, side); w.position.set(x, v.R, side * zw); carGroup.add(w); wheels.push(w);
    }
    const lightMat = (c, i) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i });
    for (const side of [1, -1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.42), lightMat(0xffffff, 2.2));
      h.position.set(v.head[0], v.head[1], side * (v.W / 2 - 0.22)); carGroup.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, type === 'suv' || type === 'minivan' ? 0.36 : 0.1, 0.36), lightMat(0xff1100, 2.5));
      t.position.set(v.tail[0], v.tail[1], side * (v.W / 2 - 0.2)); carGroup.add(t);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), bodyMat);
      mirror.position.set(v.hoodEnd + 0.18, v.belt + 0.04, side * (v.W / 2 + 0.16)); carGroup.add(mirror);
    }
    const len = v.pts[0][0] - v.pts[v.pts.length - 1][0];
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(len + 1.6, v.W + 1.6),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.004; carGroup.add(sh);
    // limpia selecciones que no existen en este tipo (coupé sin puertas traseras)
    if (v.doors < 4) { selected.delete(7); selected.delete(11); }
    syncSel();
  }

  function syncSel() {
    for (let i = 0; i < 13; i++) uniforms.uSel.value[i] = selected.has(i) ? 1 : 0;
    onChange && onChange([...selected], vtype);
  }

  // Transición: el carro sale manejando y entra el nuevo
  let anim = null;
  function setVehicle(type) {
    if (type === vtype && body) return;
    const start = performance.now();
    anim = { phase: 'out', start, type };
  }
  function easeInOut(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  // Selección por clic / toque
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  let downAt = null;
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!body) return -10;
    const hit = ray.intersectObject(body, false)[0];
    if (!hit) return -10;
    const p = body.worldToLocal(hit.point.clone());
    p.x -= 0; // carGroup sin escala
    return zoneOf(current, p, hit.face.normal);
  }
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  el.addEventListener('pointerup', e => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null;
    if (moved > 6 || anim) return;
    const z = pick(e);
    if (z >= 0) toggle(z);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const z = pick(e);
    uniforms.uHover.value = z >= 0 ? z : -10;
    el.style.cursor = z >= 0 ? 'pointer' : 'grab';
    onHover && onHover(z, e);
  });
  el.addEventListener('pointerleave', () => { uniforms.uHover.value = -10; onHover && onHover(-10); });

  function toggle(z) {
    if (selected.has(z)) selected.delete(z); else selected.add(z);
    syncSel();
  }
  function clear() { selected.clear(); syncSel(); }
  function setColor(hex) { bodyMat.color.set(hex); }

  // Vistas rápidas
  let camAnim = null;
  const VIEWS = {
    left: [-0.6, 2.2, 8.2], right: [-0.6, 2.2, -8.2], front: [-8.2, 2.0, 0.4],
    rear: [8.2, 2.2, 0.4], top: [0.01, 9.5, 0.6], iso: [-5.6, 2.7, 6.4]
  };
  function setView(name) {
    controls.autoRotate = false;
    camAnim = { from: camera.position.clone(), to: new THREE.Vector3(...VIEWS[name]).sub(controls.target).multiplyScalar(fit).add(controls.target), start: performance.now() };
  }

  let fit = 1;
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = 34; camera.updateProjectionMatrix();
    const nf = THREE.MathUtils.clamp(1.2 / camera.aspect, 1, 2.2);
    const off = camera.position.clone().sub(controls.target);
    off.multiplyScalar(nf / fit); camera.position.copy(controls.target).add(off);
    fit = nf; controls.minDistance = 4.5 * fit; controls.maxDistance = 13 * fit;
  }
  new ResizeObserver(resize).observe(container); resize();

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(container);

  const clock = new THREE.Clock();
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;
    ring2.rotation.z += dt * 0.25;
    if (anim) {
      const D = 520; const t = Math.min(1, (now - anim.start) / D);
      if (anim.phase === 'out') {
        const e = t * t; carGroup.position.x = -9 * e;
        wheels.forEach(w => w.userData.spin.rotation.z += dt * 18 * (0.3 + e));
        if (t >= 1) { buildCar(anim.type); carGroup.position.x = 9; anim = { phase: 'in', start: now, type: anim.type }; }
      } else {
        const e = 1 - Math.pow(1 - t, 3); carGroup.position.x = 9 * (1 - e);
        wheels.forEach(w => w.userData.spin.rotation.z += dt * 18 * (1 - e));
        if (t >= 1) { carGroup.position.x = 0; anim = null; }
      }
    }
    if (camAnim) {
      const t = Math.min(1, (now - camAnim.start) / 900);
      camera.position.lerpVectors(camAnim.from, camAnim.to, easeInOut(t));
      if (t >= 1) camAnim = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  buildCar('sedan');
  requestAnimationFrame(loop);

  return { setVehicle, toggle, clear, setColor, setView, getSelected: () => [...selected], getType: () => vtype };
}
