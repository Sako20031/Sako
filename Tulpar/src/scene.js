import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildCar } from './car.js';

// Camera keyframes per section. pos/target in metres, shift = horizontal frame offset
// (fraction of width, + moves the car right), dim = canvas dimming (0..1).
const KEYS = {
  hero:       { pos: [6.6, 1.25, 7.6],  target: [0.1, 0.55, 0],  shift: 0.2,  dim: 0,    front: 1,   rear: 0.4 },
  manifesto:  { pos: [0.4, 0.9, 10.5],   target: [0, 0.62, 0],    shift: 0,    dim: 0.62, front: 0.6, rear: 0.6 },
  numbers:    { pos: [-7.2, 1.5, 6.0],  target: [-0.4, 0.75, 0], shift: 0,    dim: 0.2 , front: 0.3, rear: 1.6 },
  showroom:   { pos: [7.4, 2.4, 7.8],   target: [0, 0.5, 0],     shift: 0.17,  dim: 0,    front: 0.8, rear: 0.8 },
  collection: { pos: [4.2, 9.5, 6.0],   target: [0, 0.3, 0],     shift: 0,    dim: 0.82, front: 0.6, rear: 0.6 },
  services:   { pos: [-9.5, 1.3, -2.0], target: [0, 0.6, 0],     shift: 0,    dim: 0.75, front: 0.3, rear: 1.4 },
  process:    { pos: [-4.5, 5.5, -8.5], target: [0, 0.5, 0],     shift: 0,    dim: 0.85, front: 0.3, rear: 1 },
  cta:        { pos: [8.4, 1.0, 4.6],   target: [0, 0.55, 0],    shift: 0.2,  dim: 0.05, front: 1.8, rear: 0.4 },
  footer:     { pos: [10.5, 1.1, 3.2],   target: [0, 0.6, 0],     shift: 0.1,  dim: 0.5,  front: 1.4, rear: 0.4 },
};
const MOBILE_SHIFT = 0; // on narrow screens the car stays centred

const smoothstep = (t) => t * t * (3 - 2 * t);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

// Lerp that keeps the camera on the outside of the car: horizontal radius is
// interpolated separately so a path between opposite sides arcs around instead of cutting through.
function orbitLerp(a, b, t) {
  const ra = Math.hypot(a.x, a.z), rb = Math.hypot(b.x, b.z);
  a.lerp(b, t);
  const r = ra + (rb - ra) * t;
  const h = Math.hypot(a.x, a.z);
  if (h > 1e-3) { a.x *= r / h; a.z *= r / h; }
  else { a.x = r; }
  return a;
}

function makeStudioEnv(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(30, 14, 30),
    new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.BackSide }),
  );
  room.position.y = 6;
  env.add(room);
  const box = (w, h, d, x, y, z, color, power) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power) }),
    );
    m.position.set(x, y, z);
    env.add(m);
  };
  // Long overhead strips draw the signature reflection lines along the body
  box(14, 0.12, 0.7, 0, 9, -1.4, 0xffffff, 3.2);
  box(14, 0.12, 0.7, 0, 9, 1.4, 0xffffff, 3.2);
  box(12, 0.12, 0.4, 0, 8.6, 0, 0xffffff, 1.8);
  // Side softboxes
  box(0.2, 3, 10, -12, 3, 0, 0xffffff, 1.6);
  box(10, 3, 0.2, 0, 3, 12, 0xe8eef5, 1.2);
  // Warm gold strip — the brand accent
  box(10, 0.5, 0.2, 0, 2.4, -12, 0xc9a45c, 2.2);
  box(0.2, 0.4, 8, 12, 2.2, 0, 0xc9a45c, 1.4);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  return tex;
}

function radialTexture(stops, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeWind(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = 0.05 + Math.pow(Math.random(), 1.6) * 3.2;
    const side = Math.random() < 0.5 ? -1 : 1;
    pos[i * 3 + 2] = side * (1.25 + Math.random() * 5);
    speed[i] = 0.6 + Math.random() * 1.4;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xd9b46a, size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.75,
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']], 64),
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  return { points, speed };
}

export function createStage(canvas, { reducedMotion, isMobile }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance', alpha: false });
  renderer.setClearColor(0x08090b, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = isMobile ? 1.35 : 1.05;
  const maxDpr = isMobile ? 1.25 : 1.75;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08090b);
  scene.fog = new THREE.Fog(0x08090b, 9, 22);
  scene.environment = makeStudioEnv(renderer);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);

  // Floor: soft spotlight pool + contact shadow + turntable ring
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.78, metalness: 0.0, envMapIntensity: 0.12 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(70,64,52,.55)'], [0.45, 'rgba(30,28,24,.25)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true, depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.002;
  scene.add(pool);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.9),
    new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(0,0,0,.95)'], [0.55, 'rgba(0,0,0,.6)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true, depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  scene.add(shadow);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.45, 3.47, 160),
    new THREE.MeshBasicMaterial({ color: 0xc9a45c, transparent: true, opacity: 0.45 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.006;
  scene.add(ring);

  // Key + rim lights complement the environment
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9a45c, 0.7);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  const { car, paint, wheels, lights } = buildCar();
  const turntable = new THREE.Group();
  turntable.add(car);
  scene.add(turntable);

  const wind = makeWind(isMobile ? 500 : 1400);
  if (!reducedMotion) scene.add(wind.points);

  // Post-processing (desktop only)
  let composer = null;
  if (!isMobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.5, 0.92));
    composer.addPass(new OutputPass());
  }

  // ---------- State ----------
  const sections = [...document.querySelectorAll('[data-cam]')];
  const cur = { pos: new THREE.Vector3(...KEYS.hero.pos), target: new THREE.Vector3(...KEYS.hero.target), shift: KEYS.hero.shift, dim: 0, front: 1, rear: 0.4 };
  const goal = { pos: new THREE.Vector3(), target: new THREE.Vector3(), shift: 0, dim: 0, front: 1, rear: 0.4 };
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const spin = { angle: 0, vel: 0, dragging: false, lastX: 0, active: false };
  const paintGoal = new THREE.Color(0x0d0e10);
  let tops = [];
  let width = 1, height = 1, narrow = false;
  let scrollVel = 0, lastScroll = window.scrollY;
  let running = true, intro = reducedMotion ? 1 : 0;

  function measure() {
    tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    narrow = width < 860;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    renderer.setSize(width, height, false);
    composer?.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = narrow ? 42 : 32;
    camera.updateProjectionMatrix();
    measure();
  }

  function computeGoal() {
    const y = window.scrollY, vh = height;
    const k0 = KEYS[sections[0].dataset.cam];
    goal.pos.set(...k0.pos); goal.target.set(...k0.target);
    goal.shift = k0.shift; goal.dim = k0.dim; goal.front = k0.front; goal.rear = k0.rear;
    for (let i = 1; i < sections.length; i++) {
      const p = Math.min(1, Math.max(0, (y + vh - tops[i]) / vh));
      if (p <= 0) break;
      const k = KEYS[sections[i].dataset.cam];
      const t = smoothstep(p);
      orbitLerp(goal.pos, tmpA.set(...k.pos), t);
      goal.target.lerp(tmpB.set(...k.target), t);
      goal.shift += (k.shift - goal.shift) * t;
      goal.dim += (k.dim - goal.dim) * t;
      goal.front += (k.front - goal.front) * t;
      goal.rear += (k.rear - goal.rear) * t;
    }
    // Showroom is "active" while its key dominates
    const si = sections.findIndex((s) => s.dataset.cam === 'showroom');
    spin.active = si > -1 && y + vh * 0.5 > tops[si] && y + vh * 0.5 < tops[si + 1];
  }

  // ---------- Input ----------
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / width) * 2 - 1;
    pointer.y = (e.clientY / height) * 2 - 1;
  }, { passive: true });

  function bindDrag(el) {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      spin.dragging = true; spin.lastX = e.clientX; spin.vel = 0;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!spin.dragging) return;
      const dx = e.clientX - spin.lastX;
      spin.lastX = e.clientX;
      spin.vel = dx * 0.006;
      spin.angle += spin.vel;
    });
    const end = () => { spin.dragging = false; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function setPaint(hex) { paintGoal.set(hex); }

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  const windPos = wind.points.geometry.attributes.position;

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    const sy = window.scrollY;
    scrollVel = damp(scrollVel, (sy - lastScroll) / Math.max(dt, 1e-3), 6, dt);
    lastScroll = sy;

    computeGoal();
    const k = reducedMotion ? 60 : 3.6;
    cur.pos.x = damp(cur.pos.x, goal.pos.x, k, dt);
    cur.pos.y = damp(cur.pos.y, goal.pos.y, k, dt);
    cur.pos.z = damp(cur.pos.z, goal.pos.z, k, dt);
    cur.target.x = damp(cur.target.x, goal.target.x, k, dt);
    cur.target.y = damp(cur.target.y, goal.target.y, k, dt);
    cur.target.z = damp(cur.target.z, goal.target.z, k, dt);
    cur.shift = damp(cur.shift, narrow ? MOBILE_SHIFT : goal.shift, k, dt);
    cur.dim = damp(cur.dim, goal.dim, 5, dt);
    cur.front = damp(cur.front, goal.front, 3, dt);
    cur.rear = damp(cur.rear, goal.rear, 3, dt);

    // Intro: camera pulls in from further away as the loader leaves
    const introOffset = (1 - smoothstep(intro)) * 3.5;

    pointer.sx = damp(pointer.sx, reducedMotion ? 0 : pointer.x, 2.5, dt);
    pointer.sy = damp(pointer.sy, reducedMotion ? 0 : pointer.y, 2.5, dt);

    // Never let the damped camera slip inside the car's footprint
    const hr = Math.hypot(cur.pos.x, cur.pos.z);
    if (hr < 5 && cur.pos.y < 3 && hr > 1e-3) { cur.pos.x *= 5 / hr; cur.pos.z *= 5 / hr; }

    camera.position.copy(cur.pos);
    const dir = tmpA.copy(cur.pos).sub(cur.target);
    const dist = dir.length();
    dir.normalize();
    // Portrait screens need more distance to fit a 4.7 m car
    camera.position.addScaledVector(dir, introOffset + (narrow ? dist * 0.32 : 0));
    const right = tmpB.set(-dir.z, 0, dir.x).normalize();
    camera.position.addScaledVector(right, pointer.sx * 0.3);
    camera.position.y += -pointer.sy * 0.15;
    camera.lookAt(cur.target);
    camera.setViewOffset(width, height, -cur.shift * width, narrow ? height * 0.14 : 0, width, height);

    // Turntable: inertia when dragging, gentle drift in the showroom, return home elsewhere
    if (!spin.dragging) {
      spin.vel *= Math.exp(-3 * dt);
      spin.angle += spin.vel;
      if (spin.active && !reducedMotion) spin.angle += dt * 0.12;
      if (!spin.active) spin.angle = damp(spin.angle, Math.round(spin.angle / (Math.PI * 2)) * Math.PI * 2, 2, dt);
    }
    turntable.rotation.y = spin.angle;

    // Wheels roll slightly with scroll speed
    const roll = scrollVel * 0.0006;
    for (const w of wheels) w.rotation.z -= roll;

    paint.color.lerp(paintGoal, 1 - Math.exp(-4 * dt));
    lights.front.emissiveIntensity = cur.front * (0.85 + 0.15 * Math.sin(t * 1.3));
    lights.rear.emissiveIntensity = cur.rear;
    ring.material.opacity = 0.18 + 0.27 * (1 - cur.dim);

    if (!reducedMotion) {
      const v = 1.4 + Math.min(Math.abs(scrollVel) * 0.012, 14);
      for (let i = 0; i < wind.speed.length; i++) {
        let x = windPos.getX(i) - wind.speed[i] * v * dt;
        if (x < -11) x += 22;
        windPos.setX(i, x);
      }
      windPos.needsUpdate = true;
    }

    canvas.style.opacity = String(1 - cur.dim);
    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  // Warm-up: compile shaders before revealing
  resize();
  renderer.compile(scene, camera);

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    const vis = document.visibilityState === 'visible';
    if (vis && !running) { running = true; clock.getDelta(); frame(); }
    else if (!vis) running = false;
  });

  return {
    start() { frame(); },
    playIntro(gsap) {
      if (reducedMotion) return;
      const o = { v: 0 };
      gsap.to(o, { v: 1, duration: 2.4, ease: 'power3.out', onUpdate: () => { intro = o.v; } });
    },
    bindDrag,
    setPaint,
    measure,
  };
}
