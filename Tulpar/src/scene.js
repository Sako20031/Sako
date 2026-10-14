import * as THREE from 'three';
import { buildCar } from './car.js';

// Camera keyframes per section. pos/target in metres, shift = horizontal frame offset
// (fraction of width, + moves the car right), dim = canvas fade toward the page colour.
const KEYS = {
  hero:       { pos: [6.4, 1.3, 7.4],   target: [0.1, 0.6, 0],   shift: 0.2,  dim: 0,    front: 1.4, rear: 0.4 },
  manifesto:  { pos: [0.4, 1.0, 10.8],  target: [0, 0.65, 0],    shift: 0,    dim: 0.72, front: 0.8, rear: 0.5 },
  numbers:    { pos: [-7.2, 1.6, 6.0],  target: [-0.4, 0.75, 0], shift: 0,    dim: 0.15, front: 0.6, rear: 1.4 },
  showroom:   { pos: [7.4, 2.4, 7.8],   target: [0, 0.55, 0],    shift: 0.17, dim: 0,    front: 1.2, rear: 0.6 },
  catalog:    { pos: [4.2, 9.5, 6.0],   target: [0, 0.3, 0],     shift: 0,    dim: 0.94, front: 0.8, rear: 0.5 },
  services:   { pos: [-9.5, 1.4, -2.0], target: [0, 0.6, 0],     shift: 0,    dim: 0.85, front: 0.6, rear: 1.2 },
  process:    { pos: [-4.5, 5.5, -8.5], target: [0, 0.5, 0],     shift: 0,    dim: 0.9,  front: 0.6, rear: 1 },
  cta:        { pos: [8.4, 1.1, 4.6],   target: [0, 0.6, 0],     shift: 0.2,  dim: 0.05, front: 1.8, rear: 0.4 },
  footer:     { pos: [10.5, 1.2, 3.2],  target: [0, 0.6, 0],     shift: 0.1,  dim: 0.6,  front: 1.4, rear: 0.4 },
};

const BG = 0xf3f0ea;
const smoothstep = (t) => t * t * (3 - 2 * t);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

// Lerp that keeps the camera outside the car: the horizontal radius is
// interpolated on its own, so moving between opposite sides arcs around the car.
function orbitLerp(a, b, t) {
  const ra = Math.hypot(a.x, a.z), rb = Math.hypot(b.x, b.z);
  a.lerp(b, t);
  const r = ra + (rb - ra) * t;
  const h = Math.hypot(a.x, a.z);
  if (h > 1e-3) { a.x *= r / h; a.z *= r / h; } else { a.x = r; }
  return a;
}

// Bright photo studio: white cove with large softboxes and two dark flags.
// The flags are what give a white car its shape — dark reflections along the body.
function makeStudioEnv(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd9d6d0).multiplyScalar(0.8), side: THREE.BackSide }),
  );
  env.add(room);
  const panel = (w, h, d, x, y, z, color, power) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power) }));
    m.position.set(x, y, z);
    env.add(m);
  };
  panel(16, 0.2, 7, 0, 10, 0, 0xffffff, 3.2);          // overhead scrim
  panel(0.2, 5, 12, -14, 4, 0, 0xffffff, 1.6);         // left softbox
  panel(12, 5, 0.2, 0, 4, 14, 0xfff8ee, 1.4);          // front softbox
  panel(14, 1.2, 0.2, 0, 2.2, -13, 0x111111, 1);       // dark flag (side line)
  panel(0.2, 1.2, 10, 13, 2.2, 0, 0x151515, 1);        // dark flag (front)
  panel(0.2, 0.6, 8, -13, 1.2, 0, 0xc9a45c, 1.6);      // warm accent
  panel(40, 0.2, 40, 0, -1, 0, 0xe9e5de, 0.9);         // bright floor bounce
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
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

// Fine gold dust drifting past the car — the "steppe wind".
function makeWind(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = 0.1 + Math.pow(Math.random(), 1.4) * 3.4;
    pos[i * 3 + 2] = (Math.random() < 0.5 ? -1 : 1) * (1.3 + Math.random() * 5);
    speed[i] = 0.6 + Math.random() * 1.4;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xb08a4e, size: 0.03, sizeAttenuation: true, transparent: true, opacity: 0.55,
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']], 64),
    depthWrite: false,
  });
  return { points: new THREE.Points(geo, mat), speed };
}

export function createStage(canvas, { reducedMotion, isMobile }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const maxDpr = isMobile ? 1.5 : 1.75;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 10, 24);
  scene.environment = makeStudioEnv(renderer);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);

  // Infinite cove floor, soft contact shadow, thin gold turntable ring
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.9, metalness: 0, envMapIntensity: 0.5 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 3.1),
    new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(20,18,15,.75)'], [0.45, 'rgba(20,18,15,.38)'], [1, 'rgba(20,18,15,0)']]),
      transparent: true, depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  scene.add(shadow);
  const tight = new THREE.Mesh(
    new THREE.PlaneGeometry(5.0, 2.0),
    new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(0,0,0,.7)'], [0.6, 'rgba(0,0,0,.25)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true, depthWrite: false,
    }),
  );
  tight.rotation.x = -Math.PI / 2;
  tight.position.y = 0.005;
  scene.add(tight);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.55, 3.57, 180),
    new THREE.MeshBasicMaterial({ color: 0xb08a4e, transparent: true, opacity: 0.6 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.006;
  scene.add(ring);

  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(3, 7, 5);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c8, 0.5));

  const { car, paint, wheels, lights } = buildCar();
  const turntable = new THREE.Group();
  turntable.add(car);
  scene.add(turntable);

  const wind = makeWind(isMobile ? 350 : 900);
  if (!reducedMotion) scene.add(wind.points);

  // ---------- State ----------
  const sections = [...document.querySelectorAll('[data-cam]')];
  const first = KEYS[sections[0].dataset.cam];
  const cur = { pos: new THREE.Vector3(...first.pos), target: new THREE.Vector3(...first.target), shift: first.shift, dim: 0, front: 1, rear: 0.4 };
  const goal = { pos: new THREE.Vector3(), target: new THREE.Vector3(), shift: 0, dim: 0, front: 1, rear: 0.4 };
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const spin = { angle: 0, vel: 0, dragging: false, lastX: 0, active: false };
  const paintGoal = paint.color.clone();
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
    camera.aspect = width / height;
    camera.fov = narrow ? 42 : 32;
    camera.updateProjectionMatrix();
    measure();
  }

  function computeGoal() {
    const y = window.scrollY, vh = height;
    goal.pos.set(...first.pos); goal.target.set(...first.target);
    goal.shift = first.shift; goal.dim = first.dim; goal.front = first.front; goal.rear = first.rear;
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
    const si = sections.findIndex((s) => s.dataset.cam === 'showroom');
    spin.active = si > -1 && y + vh * 0.5 > tops[si] && y + vh * 0.5 < (tops[si + 1] ?? Infinity);
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
    cur.shift = damp(cur.shift, narrow ? 0 : goal.shift, k, dt);
    cur.dim = damp(cur.dim, goal.dim, 5, dt);
    cur.front = damp(cur.front, goal.front, 3, dt);
    cur.rear = damp(cur.rear, goal.rear, 3, dt);

    // Never let the damped camera slip inside the car
    const hr = Math.hypot(cur.pos.x, cur.pos.z);
    if (hr < 5 && cur.pos.y < 3 && hr > 1e-3) { cur.pos.x *= 5 / hr; cur.pos.z *= 5 / hr; }

    const introOffset = (1 - smoothstep(intro)) * 3.5;
    pointer.sx = damp(pointer.sx, reducedMotion ? 0 : pointer.x, 2.5, dt);
    pointer.sy = damp(pointer.sy, reducedMotion ? 0 : pointer.y, 2.5, dt);

    camera.position.copy(cur.pos);
    const dir = tmpA.copy(cur.pos).sub(cur.target);
    const dist = dir.length();
    dir.normalize();
    // Portrait screens need more distance to fit a 4.9 m car
    camera.position.addScaledVector(dir, introOffset + (narrow ? dist * 0.32 : 0));
    const right = tmpB.set(-dir.z, 0, dir.x).normalize();
    camera.position.addScaledVector(right, pointer.sx * 0.3);
    camera.position.y += -pointer.sy * 0.15;
    camera.lookAt(cur.target);
    camera.setViewOffset(width, height, -cur.shift * width, narrow ? height * 0.22 : 0, width, height);

    if (!spin.dragging) {
      spin.vel *= Math.exp(-3 * dt);
      spin.angle += spin.vel;
      if (spin.active && !reducedMotion) spin.angle += dt * 0.12;
      if (!spin.active) spin.angle = damp(spin.angle, Math.round(spin.angle / (Math.PI * 2)) * Math.PI * 2, 2, dt);
    }
    turntable.rotation.y = spin.angle;

    const roll = scrollVel * 0.0006;
    for (const w of wheels) w.rotation.z -= roll;

    paint.color.lerp(paintGoal, 1 - Math.exp(-4 * dt));
    lights.front.emissiveIntensity = cur.front * (0.9 + 0.1 * Math.sin(t * 1.3));
    lights.rear.emissiveIntensity = cur.rear * 0.6;

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
    renderer.render(scene, camera);
  }

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
    setPaint(hex) { paintGoal.set(hex); },
    measure,
  };
}
