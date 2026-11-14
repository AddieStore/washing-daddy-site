import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sprayBottle, pumpBottle, foamBlob, camAt } from './_c.js';
export default async function (L) {
  const h = L.slab(4.0, 2.9, 0.16);
  camAt(L, [6.4, 5.0, 6.4], [0.0, 0.6, 0.1], 31);
  const car = L.car(0x7f8ea8, [-0.1, h, -0.55], 0.8);
  // foam on car: roof, hood, trunk (placed in world coords from car local)
  const w = (x, y, z) => [-0.1 + x * 0.8, h + y * 0.8, -0.55 + z * 0.8];
  foamBlob(L, w(-0.24, 1.4, 0), 0.38, 30, 2, 0.8);
  foamBlob(L, w(0.95, 0.8, 0.0), 0.46, 30, 5, 0.9);
  foamBlob(L, w(-1.3, 0.82, 0.0), 0.34, 20, 8, 0.8);
  foamBlob(L, w(0.1, 0.84, 0.55), 0.18, 8, 11, 0.5);
  for (const [x, z] of [[0.95, 0.76], [-0.1, 0.76]]) foamBlob(L, w(x, 0.7, z * 0.0 + 0.0), 0.0, 0, 1);
  // canister vacuum
  const v = new THREE.Group(); v.position.set(-1.35, h, 0.75); v.rotation.y = Math.PI + 0.35; L.scene.add(v);
  const vm = L.mat(0x5409DA, { roughness: 0.3, clearcoat: 0.8 });
  const pts = [[0.001, 0.12], [0.3, 0.12], [0.34, 0.2], [0.34, 0.62], [0.3, 0.7], [0.001, 0.7]].map(p => new THREE.Vector2(...p));
  L.mesh(new THREE.LatheGeometry(pts, 48), vm, [0, 0, 0], [0, 0, 0], v);
  L.mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.07, 48), L.mat(0xf2f2f6, { roughness: 0.4 }), [0, 0.42, 0], [0, 0, 0], v);
  L.mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.08, 48), L.mat(0x1A0A33, { roughness: 0.4, clearcoat: 0.5 }), [0, 0.74, 0], [0, 0, 0], v);
  L.mesh(new THREE.TorusGeometry(0.12, 0.025, 10, 28, Math.PI), L.mat(0x1A0A33), [0, 0.78, 0], [0, 0, 0], v); // top carry handle
  L.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 20), L.chrome(), [0, 0.8, 0], [0, 0, 0]).visible = false;
  for (const a of [0.5, 2.6, 4.7]) { const x = Math.cos(a) * 0.22, z = Math.sin(a) * 0.22; L.mesh(new THREE.SphereGeometry(0.09, 16, 12), L.rubber(), [x, 0.09, z], [0, 0, 0], v); }
  L.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 20), L.mat(0xFFBA08, { roughness: 0.35, clearcoat: .6 }), [-0.3, 0.48, 0], [0, 0, Math.PI / 2], v); // port
  // corrugated hose + wand + floor head toward car
  const hc = new THREE.CatmullRomCurve3([[-0.36, 0.48, 0], [-0.6, 0.5, 0], [-0.85, 0.18, 0.1], [-1.1, 0.06, 0.3], [-1.4, 0.06, 0.15], [-1.65, 0.07, 0.2]].map(p => new THREE.Vector3(...p)));
  L.mesh(new THREE.TubeGeometry(hc, 100, 0.055, 14, false), L.mat(0x2a2c33, { roughness: 0.7, clearcoat: 0.1 }), [0, 0, 0], [0, 0, 0], v);
  L.mesh(new RoundedBoxGeometry(0.46, 0.06, 0.2, 4, 0.025), L.mat(0xFFBA08, { roughness: 0.4, clearcoat: 0.6 }), [-1.95, 0.06, 0.2], [0, 0.1, 0], v);
  L.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12), L.chrome(), [-1.72, 0.1, 0.2], [0, 0, Math.PI / 2 - 0.2], v);
  // bottles
  pumpBottle(L, { color: 0xf1eefb, label: 0x5409DA, h: 0.8, r: 0.17, pos: [1.65, h, 0.55], capColor: 0xFFBA08, rotY: 0.4 });
  sprayBottle(L, { color: 0x1F4FD8, label: 0xf4f0ff, h: 0.85, r: 0.17, pos: [1.5, h, 1.15], rotY: 0.2, cap: 0x1A0A33, trigger: 0xf7f7f9 });
}
