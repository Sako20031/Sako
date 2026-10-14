import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Procedural concept coupe. Car faces +X, sits on y = 0, centred on the origin.
// Length ≈ 4.7 m, width ≈ 1.95 m, height ≈ 1.28 m.

const AXLE = 1.42;        // half wheelbase
const WHEEL_R = 0.36;
const WHEEL_Y = 0.36;
const ARCH_R = 0.44;
const SILL = 0.31;

function smooth(geo) {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const merged = mergeVertices(geo, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

function extrudeProfile(shape, width, bevel) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 6,
    curveSegments: 40,
    steps: 1,
  });
  geo.translate(0, 0, -(width - bevel * 2) / 2);
  return geo;
}

// Pulls the Z coordinate in: plan-view taper at the ends + tumblehome toward the top.
function sculpt(geo, { halfLen, endTaper, yStart, yRange, tumble, noseTaper = 0 }) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx = Math.min(1, Math.abs(x) / halfLen);
    let k = 1 - endTaper * Math.pow(nx, 3);
    if (x > 0) k -= noseTaper * Math.pow(nx, 6);
    const ty = Math.max(0, Math.min(1, (y - yStart) / yRange));
    k *= 1 - tumble * ty * ty;
    p.setZ(i, z * k);
  }
  return geo;
}

function bodyShape() {
  const s = new THREE.Shape();
  const a = Math.asin((WHEEL_Y - SILL) / ARCH_R);
  s.moveTo(-2.3, 0.36);
  s.lineTo(-AXLE - ARCH_R * Math.cos(a), SILL);
  s.absarc(-AXLE, WHEEL_Y, ARCH_R, Math.PI + a, -a, true);
  s.lineTo(AXLE - ARCH_R * Math.cos(a), SILL);
  s.absarc(AXLE, WHEEL_Y, ARCH_R, Math.PI + a, -a, true);
  s.lineTo(2.18, 0.33);
  s.quadraticCurveTo(2.36, 0.34, 2.37, 0.5);         // chin
  s.quadraticCurveTo(2.38, 0.66, 2.2, 0.72);         // nose
  s.bezierCurveTo(1.7, 0.8, 1.1, 0.84, 0.72, 0.87);  // hood
  s.lineTo(-1.5, 0.9);                               // shoulder
  s.bezierCurveTo(-1.9, 0.9, -2.15, 0.9, -2.33, 0.95); // ducktail
  s.lineTo(-2.36, 0.88);
  s.quadraticCurveTo(-2.4, 0.62, -2.34, 0.42);       // tail
  s.lineTo(-2.3, 0.36);
  return s;
}

function cabinShape() {
  const s = new THREE.Shape();
  s.moveTo(0.78, 0.84);
  s.quadraticCurveTo(0.35, 1.12, -0.1, 1.26);   // windscreen
  s.quadraticCurveTo(-0.55, 1.33, -1.0, 1.24);  // roof
  s.bezierCurveTo(-1.45, 1.12, -1.8, 0.98, -2.12, 0.88); // fastback
  s.lineTo(0.78, 0.84);
  return s;
}

export function buildCar(envMap) {
  const car = new THREE.Group();

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x0d0e10, metalness: 0.55, roughness: 0.32,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.25,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x030405, metalness: 0.85, roughness: 0.06, clearcoat: 1, envMapIntensity: 0.9,
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x050506, metalness: 0.2, roughness: 0.6 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0, roughness: 0.92 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xc4c7cc, metalness: 1, roughness: 0.22, envMapIntensity: 1.6 });
  const caliper = new THREE.MeshStandardMaterial({ color: 0xc9a45c, metalness: 0.6, roughness: 0.35 });
  const front = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f1ea, emissiveIntensity: 0.4 });
  const rear = new THREE.MeshStandardMaterial({ color: 0x300406, emissive: 0xff1f2a, emissiveIntensity: 0.6, toneMapped: true });

  // Body
  const W = 1.94;
  let bodyGeo = extrudeProfile(bodyShape(), W, 0.12);
  sculpt(bodyGeo, { halfLen: 2.38, endTaper: 0.14, noseTaper: 0.08, yStart: 0.55, yRange: 0.42, tumble: 0.16 });
  bodyGeo = smooth(bodyGeo);
  const body = new THREE.Mesh(bodyGeo, paint);
  car.add(body);

  // Greenhouse (tinted glass with floating roof look)
  let cabGeo = extrudeProfile(cabinShape(), 1.46, 0.14);
  sculpt(cabGeo, { halfLen: 2.2, endTaper: 0.12, yStart: 0.84, yRange: 0.45, tumble: 0.34 });
  cabGeo = smooth(cabGeo);
  const cabin = new THREE.Mesh(cabGeo, glass);
  car.add(cabin);

  // Lower cladding between the arches
  const sillGeo = new THREE.BoxGeometry(2.0, 0.07, 0.04);
  for (const z of [-1, 1]) {
    const sill = new THREE.Mesh(sillGeo, black);
    sill.position.set(0, SILL + 0.035, z * 0.955);
    car.add(sill);
  }

  // Front intake
  const intake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 1.25), black);
  intake.position.set(2.33, 0.44, 0);
  car.add(intake);

  // Light signatures
  const drl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 1.46), front);
  drl.position.set(2.305, 0.655, 0);
  car.add(drl);
  for (const z of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.03), front);
    blade.position.set(2.2, 0.66, z * 0.74);
    blade.rotation.y = z * 0.5;
    car.add(blade);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 1.62), rear);
  tail.position.set(-2.365, 0.82, 0);
  car.add(tail);

  // Mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.16, 0.07, 0.14);
  for (const z of [-1, 1]) {
    const m = new THREE.Mesh(mirrorGeo, paint);
    m.position.set(0.55, 0.96, z * 0.86);
    car.add(m);
  }

  // Wheel wells (dark liners give depth to the arches)
  const wellGeo = new THREE.CylinderGeometry(ARCH_R - 0.01, ARCH_R - 0.01, 1.7, 36, 1, true);
  wellGeo.rotateX(Math.PI / 2);
  const wellMat = new THREE.MeshBasicMaterial({ color: 0x020203, side: THREE.BackSide });
  for (const x of [-AXLE, AXLE]) {
    const well = new THREE.Mesh(wellGeo, wellMat);
    well.position.set(x, WHEEL_Y, 0);
    car.add(well);
  }

  // Wheels
  const wheels = [];
  const tyreGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.27, 48);
  tyreGeo.rotateX(Math.PI / 2);
  const sideGeo = new THREE.TorusGeometry(WHEEL_R - 0.035, 0.035, 12, 48);
  const rimGeo = new THREE.CylinderGeometry(0.255, 0.255, 0.02, 48);
  rimGeo.rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.05, 0.24, 0.035);
  spokeGeo.translate(0, 0.125, 0);
  const hubGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 20);
  hubGeo.rotateX(Math.PI / 2);
  const discGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.02, 36);
  discGeo.rotateX(Math.PI / 2);
  const calGeo = new THREE.BoxGeometry(0.1, 0.16, 0.06);

  for (const x of [-AXLE, AXLE]) {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, WHEEL_Y, side * 0.83);
      const spin = new THREE.Group();
      pivot.add(spin);

      spin.add(new THREE.Mesh(tyreGeo, rubber));
      const wall = new THREE.Mesh(sideGeo, rubber);
      wall.position.z = side * 0.115;
      spin.add(wall);

      const face = new THREE.Group();
      face.position.z = side * 0.1;
      const barrel = new THREE.Mesh(rimGeo, black);
      face.add(barrel);
      for (let i = 0; i < 10; i++) {
        const sp = new THREE.Mesh(spokeGeo, rim);
        sp.rotation.z = (i / 10) * Math.PI * 2 + (i % 2 ? 0.08 : 0);
        sp.position.z = side * 0.02;
        face.add(sp);
      }
      const hub = new THREE.Mesh(hubGeo, rim);
      hub.position.z = side * 0.03;
      face.add(hub);
      spin.add(face);

      const disc = new THREE.Mesh(discGeo, rim);
      disc.position.z = side * 0.06;
      pivot.add(disc);
      const cal = new THREE.Mesh(calGeo, caliper);
      cal.position.set(x > 0 ? -0.17 : 0.17, 0.08, side * 0.075);
      pivot.add(cal);

      car.add(pivot);
      wheels.push(spin);
    }
  }

  car.traverse((o) => { if (o.isMesh && envMap && 'envMap' in o.material) o.material.envMap = envMap; });

  return { car, paint, wheels, lights: { front, rear } };
}
