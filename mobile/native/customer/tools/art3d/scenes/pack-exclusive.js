import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sprayBottle, sparkle, camAt } from './_c.js';
export default async function (L) {
  const h = L.slab(4.0, 2.9, 0.16);
  camAt(L, [6.2, 4.6, 6.4], [0.0, 0.7, 0.1], 31);
  const car = L.car(0x5409DA, [-0.2, h, -0.45], 0.84);
  // extra gloss: clearcoat reflections via paint material tweak
  car.traverse(o => { if (o.material && o.material.clearcoat === 1 && o.material.metalness > 0.4) { o.material.metalness = 0.75; o.material.roughness = 0.14; o.material.color.set(0x4a08c4); } });
  // ceramic bottle (white + gold cap) front right
  sprayBottle(L, { color: 0xf5f2ff, label: 0x5409DA, h: 1.0, r: 0.2, pos: [1.55, h, 0.95], rotY: -0.5, cap: 0xFFBA08, trigger: 0xFFBA08 });
  // gold badge on a small stand front left: round medal with ring + star
  const b = new THREE.Group(); b.position.set(-1.3, h, 0.9); b.rotation.y = 0.5; L.scene.add(b);
  const gold = L.mat(0xFFBA08, { metalness: 1, roughness: 0.22, clearcoat: 0.6 });
  L.mesh(new RoundedBoxGeometry(0.7, 0.07, 0.45, 3, 0.03), L.mat(0x1A0A33, { roughness: 0.4, clearcoat: 0.6 }), [0, 0.035, 0], [0, 0, 0], b);
  const disc = L.mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.07, 64), gold, [0, 0.52, 0], [Math.PI / 2, 0, 0], b);
  L.mesh(new THREE.TorusGeometry(0.4, 0.04, 16, 64), gold, [0, 0.52, 0.035], [0, 0, 0], b);
  L.mesh(new THREE.TorusGeometry(0.31, 0.012, 10, 64), L.mat(0x8a5a00, { metalness: 1, roughness: 0.4 }), [0, 0.52, 0.04], [0, 0, 0], b);
  L.mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 12), gold, [0, 0.2, -0.03], [0, 0, 0], b);
  // star on badge
  const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.07 : 0.17; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? st.lineTo(x, y) : st.moveTo(x, y); }
  L.mesh(new THREE.ExtrudeGeometry(st, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), L.mat(0x5409DA, { roughness: 0.25, clearcoat: 1 }), [0, 0.52, 0.05], [0, 0, 0], b);
  // sparkles around car
  for (const [x, y, z, s, c] of [[-0.9, 1.9, 0.5, 0.3, 0xFFD54A], [0.9, 2.0, 1.0, 0.22, 0xffffff], [0.2, 2.15, -0.3, 0.2, 0xFFD54A], [1.85, 1.2, -0.2, 0.26, 0xFFD54A], [-1.8, 1.25, -0.5, 0.18, 0xffffff], [-0.3, 1.45, 1.1, 0.16, 0xFFD54A]]) sparkle(L, [x, h + y, z], s, c, 0.6);
}
