import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Procedural business sedan modelled on the Toyota Camry XV70 proportions
// (4.89 × 1.84 × 1.45 m, wheelbase 2.83 m). Faces +X, sits on y = 0.

const FRONT_AXLE = 1.47;
const REAR_AXLE = -1.36;
const WHEEL_R = 0.34;
const WHEEL_Y = 0.34;
const ARCH_R = 0.405;
const SILL = 0.27;
const W = 1.84;

function smooth(geo) {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const merged = mergeVertices(geo, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

function extrudeProfile(shape, width, bevel, segs = 6) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: segs,
    curveSegments: 40,
  });
  geo.translate(0, 0, -(width - bevel * 2) / 2);
  return geo;
}

// Narrows Z toward the ends (plan view) and toward the top (tumblehome).
function sculpt(geo, { halfLen, endTaper, noseTaper = 0, yStart, yRange, tumble }) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx = Math.min(1, Math.abs(x) / halfLen);
    let k = 1 - endTaper * Math.pow(nx, 4);
    if (x > 0) k -= noseTaper * Math.pow(nx, 8);
    const ty = Math.max(0, Math.min(1, (y - yStart) / yRange));
    k *= 1 - tumble * ty * ty;
    p.setZ(i, z * k);
  }
  return geo;
}

function bodyShape() {
  const s = new THREE.Shape();
  const a = Math.asin((WHEEL_Y - SILL) / ARCH_R);
  s.moveTo(-2.36, 0.34);
  s.lineTo(REAR_AXLE - ARCH_R * Math.cos(a), SILL);
  s.absarc(REAR_AXLE, WHEEL_Y, ARCH_R, Math.PI + a, -a, true);
  s.lineTo(FRONT_AXLE - ARCH_R * Math.cos(a), SILL);
  s.absarc(FRONT_AXLE, WHEEL_Y, ARCH_R, Math.PI + a, -a, true);
  s.lineTo(2.28, 0.27);
  s.quadraticCurveTo(2.43, 0.28, 2.44, 0.44);          // lower bumper
  s.quadraticCurveTo(2.46, 0.66, 2.36, 0.74);          // nose / headlamps
  s.bezierCurveTo(1.95, 0.81, 1.35, 0.89, 0.98, 0.93); // hood to cowl
  s.lineTo(-1.5, 0.99);                                 // beltline
  s.bezierCurveTo(-1.85, 1.0, -2.2, 1.0, -2.38, 0.98);  // trunk lid + lip
  s.quadraticCurveTo(-2.45, 0.86, -2.42, 0.62);        // tail
  s.quadraticCurveTo(-2.41, 0.4, -2.36, 0.34);
  return s;
}

function cabinPath() {
  const s = new THREE.Shape();
  s.moveTo(1.02, 0.9);
  s.quadraticCurveTo(0.5, 1.28, -0.02, 1.42);   // windscreen
  s.quadraticCurveTo(-0.5, 1.48, -0.98, 1.41);  // roof
  s.quadraticCurveTo(-1.35, 1.27, -1.62, 0.98); // rear window
  s.lineTo(1.02, 0.9);
  return s;
}

function roofShape() {
  // A thin cap that follows the top of the cabin, painted body colour.
  const s = new THREE.Shape();
  const top = new THREE.QuadraticBezierCurve(new THREE.Vector2(-0.02, 1.42), new THREE.Vector2(-0.5, 1.48), new THREE.Vector2(-0.98, 1.41));
  const pts = top.getPoints(24);
  const front = new THREE.QuadraticBezierCurve(new THREE.Vector2(1.02, 0.9), new THREE.Vector2(0.5, 1.28), new THREE.Vector2(-0.02, 1.42)).getPoints(24).slice(-4);
  const rear = new THREE.QuadraticBezierCurve(new THREE.Vector2(-0.98, 1.41), new THREE.Vector2(-1.35, 1.27), new THREE.Vector2(-1.62, 0.98)).getPoints(24).slice(0, 4);
  const line = [...front, ...pts.slice(1), ...rear.slice(1)];
  s.moveTo(line[0].x, line[0].y + 0.012);
  for (const p of line.slice(1)) s.lineTo(p.x, p.y + 0.012);
  for (const p of [...line].reverse()) s.lineTo(p.x, p.y - 0.09);
  return s;
}

export function buildCar() {
  const car = new THREE.Group();

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xf1f0ec, metalness: 0.05, roughness: 0.3,
    clearcoat: 1, clearcoatRoughness: 0.04,
    iridescence: 0.25, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 420],
  });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c1014, metalness: 0.6, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.2 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x0a0b0d, metalness: 0.3, roughness: 0.18, clearcoat: 1 });
  const matte = new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0.1, roughness: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1, roughness: 0.12 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111113, metalness: 0, roughness: 0.9 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xcfd2d6, metalness: 1, roughness: 0.2 });
  const lamp = new THREE.MeshPhysicalMaterial({ color: 0x1b1f24, metalness: 0.4, roughness: 0.05, clearcoat: 1 });
  const led = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f6ff, emissiveIntensity: 1.2 });
  const tailRed = new THREE.MeshPhysicalMaterial({ color: 0x5a0408, emissive: 0xd0101a, emissiveIntensity: 0.5, roughness: 0.1, clearcoat: 1 });

  // Body
  // A small bevel keeps the edges crisp; it grows the outline by ~5 cm, which the trim positions allow for.
  let bodyGeo = extrudeProfile(bodyShape(), W - 0.1, 0.06);
  sculpt(bodyGeo, { halfLen: 2.46, endTaper: 0.16, noseTaper: 0.1, yStart: 0.6, yRange: 0.42, tumble: 0.12 });
  bodyGeo = smooth(bodyGeo);
  car.add(new THREE.Mesh(bodyGeo, paint));

  // Greenhouse: dark glass + blacked-out pillars, white roof cap on top
  let cabGeo = extrudeProfile(cabinPath(), 1.42, 0.08);
  sculpt(cabGeo, { halfLen: 2.3, endTaper: 0.1, yStart: 0.92, yRange: 0.52, tumble: 0.3 });
  cabGeo = smooth(cabGeo);
  car.add(new THREE.Mesh(cabGeo, glass));

  let roofGeo = extrudeProfile(roofShape(), 1.42, 0.05, 4);
  sculpt(roofGeo, { halfLen: 2.3, endTaper: 0.1, yStart: 0.92, yRange: 0.52, tumble: 0.3 });
  roofGeo = smooth(roofGeo);
  const roof = new THREE.Mesh(roofGeo, paint);
  roof.scale.set(1, 1, 1.015);
  car.add(roof);

  // Chrome window line along the beltline
  for (const z of [-1, 1]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.018, 0.015), chrome);
    trim.position.set(-0.3, 0.955, z * 0.715);
    trim.rotation.z = -0.022;
    car.add(trim);
  }

  // Front: black upper grille band with emblem, big lower grille with horizontal slats
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.86), gloss);
  upper.position.set(2.47, 0.655, 0);
  car.add(upper);
  const emblem = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 10, 32), chrome);
  emblem.rotation.y = Math.PI / 2;
  emblem.scale.set(1, 0.72, 1);
  emblem.position.set(2.5, 0.655, 0);
  car.add(emblem);
  const lowerGrille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 1.3), gloss);
  lowerGrille.position.set(2.49, 0.45, 0);
  car.add(lowerGrille);
  for (let i = 0; i < 6; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 1.24 - i * 0.03), chrome);
    slat.position.set(2.522, 0.355 + i * 0.038, 0);
    car.add(slat);
  }

  // Headlamps: swept glass units with an LED signature, wrapping round the corner
  for (const z of [-1, 1]) {
    const unit = new THREE.Group();
    unit.position.set(2.41, 0.7, z * 0.58);
    unit.rotation.y = z * -0.42;
    unit.rotation.z = -0.12;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.085, 0.44), lamp);
    unit.add(housing);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.014, 0.38), led);
    strip.position.set(0.036, -0.032, 0);
    unit.add(strip);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 20), chrome);
    lens.rotation.z = Math.PI / 2;
    lens.position.set(0.036, 0.01, z * -0.1);
    unit.add(lens);
    car.add(unit);
    const fog = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.14), gloss);
    fog.position.set(2.43, 0.36, z * 0.74);
    car.add(fog);
  }

  // Rear: wraparound tail lamps + chrome strip on the trunk
  for (const z of [-1, 1]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.52), tailRed);
    tl.position.set(-2.475, 0.86, z * 0.54);
    tl.rotation.y = z * 0.3;
    car.add(tl);
  }
  const trunkChrome = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.8), chrome);
  trunkChrome.position.set(-2.48, 0.82, 0);
  car.add(trunkChrome);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 1.3), matte);
  rearBumper.position.set(-2.43, 0.36, 0);
  car.add(rearBumper);

  // Mirrors (body colour on black bases) and door handles
  for (const z of [-1, 1]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.06), gloss);
    base.position.set(0.86, 0.97, z * 0.76);
    car.add(base);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12), paint);
    cap.scale.set(0.9, 0.55, 1);
    cap.position.set(0.82, 1.02, z * 0.88);
    car.add(cap);
    for (const x of [0.25, -0.75]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.02), chrome);
      h.position.set(x, 0.86, z * 0.895);
      car.add(h);
    }
  }

  // Side sills
  for (const z of [-1, 1]) {
    const sill = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.03), matte);
    sill.position.set(0.05, SILL + 0.03, z * 0.905);
    car.add(sill);
  }

  // Wheel wells
  const wellGeo = new THREE.CylinderGeometry(ARCH_R - 0.01, ARCH_R - 0.01, 1.6, 36, 1, true);
  wellGeo.rotateX(Math.PI / 2);
  const wellMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0b, side: THREE.BackSide });
  for (const x of [REAR_AXLE, FRONT_AXLE]) {
    const well = new THREE.Mesh(wellGeo, wellMat);
    well.position.set(x, WHEEL_Y, 0);
    car.add(well);
  }

  // 18" multi-spoke alloys
  const wheels = [];
  const tyreGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.235, 48);
  tyreGeo.rotateX(Math.PI / 2);
  const wallGeo = new THREE.TorusGeometry(WHEEL_R - 0.03, 0.03, 12, 48);
  const barrelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.02, 48);
  barrelGeo.rotateX(Math.PI / 2);
  const lipGeo = new THREE.TorusGeometry(0.235, 0.012, 8, 48);
  const spokeGeo = new THREE.BoxGeometry(0.026, 0.2, 0.025);
  spokeGeo.translate(0, 0.125, 0);
  const capGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24);
  capGeo.rotateX(Math.PI / 2);
  const discGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 36);
  discGeo.rotateX(Math.PI / 2);

  for (const x of [REAR_AXLE, FRONT_AXLE]) {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, WHEEL_Y, side * 0.79);
      const spin = new THREE.Group();
      pivot.add(spin);
      spin.add(new THREE.Mesh(tyreGeo, rubber));
      const wall = new THREE.Mesh(wallGeo, rubber);
      wall.position.z = side * 0.1;
      spin.add(wall);

      const face = new THREE.Group();
      face.position.z = side * 0.09;
      face.add(new THREE.Mesh(barrelGeo, matte));
      const lip = new THREE.Mesh(lipGeo, alloy);
      lip.position.z = side * 0.015;
      face.add(lip);
      for (let i = 0; i < 10; i++) {
        for (const off of [-0.07, 0.07]) {
          const sp = new THREE.Mesh(spokeGeo, alloy);
          sp.rotation.z = (i / 10) * Math.PI * 2 + off;
          sp.position.z = side * 0.02;
          face.add(sp);
        }
      }
      const cap = new THREE.Mesh(capGeo, chrome);
      cap.position.z = side * 0.03;
      face.add(cap);
      spin.add(face);

      const disc = new THREE.Mesh(discGeo, matte);
      disc.position.z = side * 0.05;
      pivot.add(disc);

      car.add(pivot);
      wheels.push(spin);
    }
  }

  return { car, paint, wheels, lights: { front: led, rear: tailRed } };
}
