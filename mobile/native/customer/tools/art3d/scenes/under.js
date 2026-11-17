import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { camAt } from './_c.js';
export default async function (L) {
  const h = L.slab(4.0, 2.9, 0.16);
  camAt(L, [6.0, 3.6, 6.0], [0.0, 0.7, 0.2], 31);
  const lift = 0.78;
  const car = L.car(0x1F4FD8, [0, h + lift, 0], 0.78);
  car.rotation.y = 0.0;
  const steel = L.mat(0x3a3d45, { metalness: 0.6, roughness: 0.4, clearcoat: 0.2 });
  const yellow = L.mat(0xFFBA08, { roughness: 0.45, clearcoat: 0.5 });
  for (const z of [-0.5, 0.5]) {
    L.mesh(new RoundedBoxGeometry(0.46, lift - 0.07, 0.14, 3, 0.04), steel, [-0.55, h + (lift - 0.07) / 2, z]);
    L.mesh(new RoundedBoxGeometry(0.62, 0.07, 0.2, 3, 0.03), yellow, [-0.55, h + lift - 0.05, z]);
    L.mesh(new RoundedBoxGeometry(0.7, 0.06, 0.4, 3, 0.02), steel, [-0.55, h + 0.03, z]);
  }
  // under-body lance: wand with elbow + fan nozzle, lying on slab pointing under the car
  const lance = new THREE.Group(); lance.position.set(0.3, h, 0.25); lance.rotation.y = -Math.PI / 2 - 0.05; L.scene.add(lance);
  L.mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 16), L.chrome(), [0.75, 0.16, 0], [0, 0, Math.PI / 2], lance);
  L.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), L.mat(0x1A0A33, { roughness: 0.5 }), [1.6, 0.16, 0], [0, 0, Math.PI / 2], lance);
  L.mesh(new RoundedBoxGeometry(0.34, 0.1, 0.1, 3, 0.04), L.mat(0xFFBA08, { roughness: 0.35, clearcoat: 0.7 }), [1.25, 0.16, 0], [0, 0, 0], lance);
  // bent end pointing up
  L.mesh(new THREE.TorusGeometry(0.1, 0.035, 12, 20, Math.PI / 2), L.chrome(), [0, 0.06, 0], [0, 0, 0], lance);
  const noz = L.mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.12, 16), L.chrome(), [-0.1, 0.22, 0], [0, 0, 0], lance);
  // water fan: translucent cone going up under car
  const wm = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.5, roughness: 0.05, transmission: 0.0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const fan = new THREE.Group(); fan.position.set(-0.1, 0.28, 0); lance.add(fan);
  const cone = L.mesh(new THREE.ConeGeometry(0.55, 0.85, 28, 1, true), wm, [0, 0.42, 0], [Math.PI, 0, 0], fan); cone.scale.z = 0.3; cone.castShadow = false;
  let s = 5; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const dm = new THREE.MeshPhysicalMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.85, roughness: 0.05, clearcoat: 1 });
  for (let i = 0; i < 90; i++) { const a = rnd() * 6.28, rr = rnd() * 0.45, y = 0.06 + rnd() * 0.9; const m = L.mesh(new THREE.SphereGeometry(0.014 + rnd() * 0.028, 10, 8), dm, [Math.cos(a) * rr * (0.5 + y) * 1.0, y, Math.sin(a) * rr * (0.3 + y) * 0.3], [0, 0, 0], fan); m.castShadow = false; }
  const hc = new THREE.CatmullRomCurve3([[1.75,0.16,0],[2.0,0.08,0.1],[2.3,0.04,0.45],[2.0,0.04,0.9],[1.5,0.04,0.7],[1.7,0.04,0.3]].map(p => new THREE.Vector3(p[0], p[1], -p[2]*0.8)));
  L.mesh(new THREE.TubeGeometry(hc, 80, 0.045, 12, false), L.mat(0x1A0A33, { roughness: 0.6, clearcoat: 0.3 }), [0, 0, 0], [0, 0, 0], lance);
  // puddle
  const pud = L.mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.01, 48), L.mat(0xcfe8ff, { roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.55 }), [0.3, h + 0.006, 0.7]); pud.scale.z = 0.55; pud.castShadow = false;
}
