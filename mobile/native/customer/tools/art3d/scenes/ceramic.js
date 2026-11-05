import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sprayBottle, cloth, waterBead, camAt } from './_c.js';
export default async function (L) {
  const h = L.slab(3.0, 2.3, 0.16);
  camAt(L, [4.6, 4.9, 5.6], [0.05, 0.42, 0.1], 28);
  const paint = L.mat(0x1F4FD8, { metalness: 0.6, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.02 });
  const tilt = 0.26, W = 2.1, D = 1.3, T = 0.14;
  const g = new THREE.Group(); g.position.set(-0.2, h + 0.1 + (D / 2) * Math.sin(tilt) + 0.02, 0.05); g.rotation.set(tilt, 0.12, 0); L.scene.add(g);
  L.mesh(new RoundedBoxGeometry(W, T, D, 6, 0.065), paint, [0, 0, 0], [0, 0, 0], g);
  L.mesh(new RoundedBoxGeometry(W - 0.12, 0.03, D - 0.12, 3, 0.012), L.mat(0x15181e, { roughness: 0.8 }), [0, -T / 2 - 0.005, 0], [0, 0, 0], g);
  // prop block under back edge
  L.mesh(new RoundedBoxGeometry(1.7, 0.3, 0.2, 3, 0.04), L.mat(0x24262c, { roughness: 0.7, clearcoat: 0 }), [-0.2 - 0.05, h + 0.15, 0.05 - 0.56], [0, 0.12, 0]);
  let s = 11; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const top = T / 2;
  for (let i = 0; i < 95; i++) { const x = (rnd() - 0.5) * (W - 0.25), z = (rnd() - 0.5) * (D - 0.25); const r = 0.022 + rnd() * rnd() * 0.06; waterBead(L, x, top + r * 0.2, z, r, g); }
  for (let i = 0; i < 9; i++) { const x = (rnd() - 0.5) * (W - 0.4), z = (rnd() - 0.5) * (D - 0.35); waterBead(L, x, top + 0.02, z, 0.085, g); }
  sprayBottle(L, { color: 0x5409DA, label: 0xf4f0ff, h: 1.05, r: 0.21, pos: [0.98, h, -0.65], rotY: -0.7, cap: 0x1A0A33, trigger: 0xf7f7f9 });
  cloth(L, { color: 0xC48600, pos: [-0.85, h, 0.98], w: 0.78, d: 0.58, n: 4, rotY: 0.3 });
}
