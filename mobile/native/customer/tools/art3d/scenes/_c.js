import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const V = (x, y) => new THREE.Vector2(x, y);
export function sprayBottle(L, { color = 0x5409DA, label = 0xf4f0ff, cap = 0x1a0a33, h = 0.9, r = 0.2, pos = [0, 0, 0], rotY = 0, body = null, trigger = 0xf7f7f9 } = {}) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; L.scene.add(g);
  const pts = [V(0.001, 0), V(r * 0.85, 0), V(r, 0.03), V(r, h * 0.62), V(r * 0.96, h * 0.7), V(r * 0.5, h * 0.8), V(r * 0.36, h * 0.85), V(r * 0.36, h * 0.9), V(0.001, h * 0.9)];
  const bm = body ?? L.mat(color, { roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  L.mesh(new THREE.LatheGeometry(pts, 48), bm, [0, 0, 0], [0, 0, 0], g);
  // label band
  L.mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, h * 0.34, 48, 1, true), L.mat(label, { roughness: 0.5, clearcoat: 0.1, side: THREE.DoubleSide }), [0, h * 0.33, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, h * 0.035, 48, 1, true), L.mat(0xFFBA08, { roughness: 0.4 }), [0, h * 0.5, 0], [0, 0, 0], g);
  // collar + head
  L.mesh(new THREE.CylinderGeometry(r * 0.4, r * 0.4, h * 0.05, 32), L.mat(cap, { roughness: 0.4 }), [0, h * 0.92, 0], [0, 0, 0], g);
  L.mesh(new RoundedBoxGeometry(r * 1.25, h * 0.14, r * 0.62, 4, 0.04), L.mat(trigger, { roughness: 0.35, clearcoat: 0.5 }), [r * 0.22, h * 1.0, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.14, r * 0.5, 16), L.mat(trigger, { roughness: 0.35 }), [r * 0.95, h * 1.01, 0], [0, 0, Math.PI / 2], g);
  L.mesh(new RoundedBoxGeometry(r * 0.1, h * 0.17, r * 0.18, 3, 0.02), L.mat(trigger, { roughness: 0.35 }), [r * 0.5, h * 0.86, 0], [0, 0, -0.35], g);
  return g;
}
export function pumpBottle(L, { color = 0x5409DA, label = 0xf4f0ff, h = 0.8, r = 0.2, pos = [0, 0, 0], capColor = 0xFFBA08, rotY = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; L.scene.add(g);
  const pts = [V(0.001, 0), V(r * 0.88, 0), V(r, 0.04), V(r, h * 0.7), V(r * 0.9, h * 0.8), V(r * 0.38, h * 0.88), V(r * 0.34, h * 0.93), V(0.001, h * 0.93)];
  L.mesh(new THREE.LatheGeometry(pts, 48), L.mat(color, { roughness: 0.25, clearcoat: 0.8 }), [0, 0, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, h * 0.4, 48, 1, true), L.mat(label, { roughness: 0.5, side: THREE.DoubleSide }), [0, h * 0.38, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(r * 0.4, r * 0.4, h * 0.07, 32), L.mat(capColor, { roughness: 0.3, clearcoat: 0.6 }), [0, h * 0.95, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(r * 0.06, r * 0.06, h * 0.14, 12), L.mat(capColor, { roughness: 0.3 }), [0, h * 1.04, 0], [0, 0, 0], g);
  L.mesh(new RoundedBoxGeometry(r * 0.9, h * 0.07, r * 0.32, 3, 0.025), L.mat(capColor, { roughness: 0.3, clearcoat: 0.6 }), [r * 0.3, h * 1.12, 0], [0, 0, 0], g);
  return g;
}
export function cloth(L, { color = 0x1F4FD8, pos = [0, 0, 0], w = 0.8, d = 0.6, n = 4, rotY = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; L.scene.add(g);
  for (let i = 0; i < n; i++) L.mesh(new RoundedBoxGeometry(w * (1 - i * 0.012), 0.045, d * (1 - i * 0.01), 4, 0.02), L.cloth(i % 2 ? color : new THREE.Color(color).offsetHSL(0, 0, 0.04)), [(i % 2) * 0.012, 0.0225 + i * 0.043, 0], [0, (i - 1.5) * 0.025, 0], g);
  return g;
}
export function bucket(L, { color = 0x1F4FD8, r = 0.5, h = 0.75, pos = [0, 0, 0], handle = 0xc9cdd3, water = true, rotY = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; L.scene.add(g);
  const pts = [V(0.001, 0), V(r * 0.7, 0), V(r * 0.72, 0.03), V(r, h - 0.05), V(r * 1.04, h - 0.02), V(r * 1.04, h + 0.02), V(r * 0.98, h + 0.02), V(r * 0.96, h - 0.02), V(r * 0.68, 0.08), V(0.001, 0.08)];
  const lm = L.mat(color, { roughness: 0.3, clearcoat: 0.7, side: THREE.DoubleSide });
  L.mesh(new THREE.LatheGeometry(pts, 64), lm, [0, 0, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(r * 0.93, r * 0.7, h * 0.12, 48), L.mat(0xf3f0ff, { roughness: 0.4 }), [0, h * 0.55, 0], [0, 0, 0], g).visible = false;
  // handle wire
  const hm = L.chrome(); const arc = new THREE.TorusGeometry(r * 1.0, 0.025, 10, 40, Math.PI); L.mesh(arc, hm, [0, h - 0.03, 0], [0, 0, 0], g);
  for (const s of [-1, 1]) L.mesh(new THREE.SphereGeometry(0.05, 12, 10), hm, [s * r * 1.0, h - 0.03, 0], [0, 0, 0], g);
  // grip
  L.mesh(new THREE.CylinderGeometry(0.06, 0.06, r * 0.7, 16), L.mat(0x1A0A33, { roughness: 0.6 }), [0, h - 0.03 + r * 1.0, 0], [0, 0, Math.PI / 2], g);
  if (water) L.mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, 0.02, 48), L.mat(0xbfe3ff, { roughness: 0.05, clearcoat: 1, transmission: 0.3, transparent: true, opacity: 0.9 }), [0, h - 0.12, 0], [0, 0, 0], g);
  return g;
}
export function foamBlob(L, at, rad = 0.4, n = 28, seed = 1, flat = 0.75) {
  let s = seed * 9301; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const m = L.mat(0xffffff, { roughness: 0.55, clearcoat: 0.05, sheen: 0.4, sheenColor: new THREE.Color(0xdfe9ff) });
  const g = new THREE.Group(); g.position.set(...at); L.scene.add(g);
  for (let i = 0; i < n; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * rad; const rr = (0.07 + rnd() * 0.1) * (1.2 - d / rad * 0.5); const m2 = L.mesh(new THREE.SphereGeometry(rr, 20, 14), m, [Math.cos(a) * d, rr * 0.7 + (1 - d / rad) * rad * 0.35 * flat * rnd(), Math.sin(a) * d], [0, 0, 0], g); }
  return g;
}
export function sparkle(L, at, size = 0.25, color = 0xFFD54A, rotY = 0) {
  const sh = new THREE.Shape(); const n = 4; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? size * 0.18 : size; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: size * 0.12, bevelEnabled: true, bevelSize: size * 0.03, bevelThickness: size * 0.03, bevelSegments: 2 }); geo.translate(0, 0, -size * 0.06);
  const m = L.mesh(geo, L.mat(color, { metalness: 0.4, roughness: 0.25, clearcoat: 1, emissive: color, emissiveIntensity: 0.25 }), at, [0, rotY, 0]); m.castShadow = false; return m;
}
export function camAt(L, pos, look, fov = 28) { L.cam.position.set(...pos); L.cam.fov = fov; L.cam.lookAt(...look); L.cam.updateProjectionMatrix(); }
export function waterBead(L, x, y, z, r, parent) { const m = L.mesh(new THREE.SphereGeometry(r, 20, 14), L.beadMat || (L.beadMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, transmission: 0.95, roughness: 0, thickness: 0.15, ior: 1.33, clearcoat: 1, transparent: true })), [x, y, z], [0, 0, 0], parent); m.scale.y = 0.55; m.castShadow = false; return m; }
