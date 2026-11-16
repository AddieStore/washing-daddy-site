import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { bucket, foamBlob, camAt } from './_c.js';
export function sprayGun(L, pos, rotY) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; L.scene.add(g);
  const body = L.mat(0xFFBA08, { roughness: 0.35, clearcoat: 0.7 }), dk = L.mat(0x1A0A33, { roughness: 0.5, clearcoat: 0.3 });
  L.mesh(new RoundedBoxGeometry(0.62, 0.2, 0.17, 5, 0.07), body, [0, 0.25, 0], [0, 0, 0], g);
  L.mesh(new RoundedBoxGeometry(0.18, 0.4, 0.15, 5, 0.06), dk, [-0.12, 0.08, 0], [0, 0, -0.18], g); // grip
  L.mesh(new RoundedBoxGeometry(0.05, 0.2, 0.06, 3, 0.02), L.chrome(), [0.08, 0.1, 0], [0, 0, 0.3], g); // trigger
  L.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 16), L.chrome(), [0.75, 0.27, 0], [0, 0, Math.PI / 2], g); // lance
  L.mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.14, 16), dk, [1.22, 0.27, 0], [0, 0, Math.PI / 2], g);
  L.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16), L.mat(0x5409DA, { roughness: 0.4, clearcoat: .6 }), [-0.33, 0.28, 0], [0, 0, Math.PI / 2], g);
  const hc = new THREE.CatmullRomCurve3([[-0.4, 0.28, 0], [-0.7, 0.12, -0.08], [-1.0, 0.05, -0.35], [-0.85, 0.05, -0.75], [-0.45, 0.05, -0.65], [-0.5, 0.05, -0.3]].map(p => new THREE.Vector3(...p)));
  L.mesh(new THREE.TubeGeometry(hc, 80, 0.045, 12, false), L.mat(0x1F4FD8, { roughness: 0.5, clearcoat: 0.4 }), [0, 0, 0], [0, 0, 0], g);
  return g;
}
export default async function (L) {
  const h = L.slab(4.0, 3.0, 0.16);
  camAt(L, [6.4, 4.8, 6.4], [0.0, 0.55, 0.15], 30);
  L.car(0x41464f, [-0.15, h, -0.45], 0.82).rotation.y = 0.0;
  bucket(L, { color: 0x1F4FD8, r: 0.34, h: 0.52, pos: [1.2, h, 0.95] });
  // sponge on the rim of the bucket + foam in it
  L.mesh(new RoundedBoxGeometry(0.34, 0.14, 0.22, 4, 0.05), L.mat(0xFFBA08, { roughness: 0.9, clearcoat: 0 }), [1.2, h + 0.55, 0.95], [0, 0.4, 0.1]);
  foamBlob(L, [1.2, h + 0.4, 0.95], 0.22, 14, 3, 0.4);
  sprayGun(L, [-0.4, h, 1.2], 0.12);
}
