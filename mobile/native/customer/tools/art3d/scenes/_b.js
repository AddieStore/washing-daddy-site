import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export { THREE };
const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
// smooth bottle profile: radius r, height h, shoulder
export function bottle(L, { r = 0.3, h = 1, color = 0x5409DA, capColor = 0xf4f4f6, label = 0xf4f1ec, labelAccent = 0xFFBA08, neck = 0.11, translucent = false, at = [0, 0, 0], parent = L.scene, rot = [0, 0, 0] }) {
  const g = new THREE.Group(); g.position.set(...at); g.rotation.set(...rot); parent.add(g);
  const b = 0.05, sh = h * 0.72, nh = h * 0.86;
  const pts = [[0.001, 0], [r - b, 0], [r, b], [r, sh - 0.12], [r * 0.9, sh], [r * 0.55, sh + (nh - sh) * 0.55], [neck + 0.015, nh], [neck, nh + 0.02], [neck, h * 0.9]];
  const bodyMat = translucent ? L.mat(color, { roughness: 0.15, clearcoat: 1, transmission: 0.6, thickness: 0.3, ior: 1.4 }) : L.plastic(color);
  L.mesh(lathe(pts), bodyMat, [0, 0, 0], [0, 0, 0], g);
  // label band
  const lh = h * 0.36, ly = h * 0.12;
  L.mesh(new THREE.CylinderGeometry(r + 0.004, r + 0.004, lh, 64, 1, true), L.mat(label, { roughness: 0.5, clearcoat: 0.2, side: THREE.DoubleSide }), [0, ly + lh / 2, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(r + 0.006, r + 0.006, lh * 0.2, 64, 1, true), L.mat(labelAccent, { roughness: 0.4, side: THREE.DoubleSide }), [0, ly + lh * 0.82, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(r + 0.006, r + 0.006, lh * 0.06, 64, 1, true), L.mat(0x1a0a33, { roughness: 0.4, side: THREE.DoubleSide }), [0, ly + lh * 0.45, 0], [0, 0, 0], g);
  // cap
  const ch = h * 0.17;
  L.mesh(new THREE.CylinderGeometry(neck + 0.045, neck + 0.05, ch, 40), L.mat(capColor, { roughness: 0.4, clearcoat: 0.5 }), [0, h * 0.88 + ch / 2, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(neck + 0.05, neck + 0.05, ch * 0.2, 40), L.mat(capColor, { roughness: 0.4 }), [0, h * 0.88 + ch * 1.05, 0], [0, 0, 0], g);
  return g;
}
export function sprayBottle(L, { r = 0.3, h = 1, color = 0x6fb4e8, trigger = 0xf4f4f6, translucent = true, at = [0, 0, 0], parent = L.scene, rot = [0, 0, 0], liquid = 0.7, label = 0xf7f7f9 }) {
  const g = new THREE.Group(); g.position.set(...at); g.rotation.set(...rot); parent.add(g);
  const sh = h * 0.7, neckR = r * 0.42;
  const pts = [[0.001, 0], [r - 0.06, 0], [r, 0.06], [r, sh - 0.1], [r * 0.82, sh], [neckR + 0.04, sh + 0.12], [neckR, sh + 0.2], [neckR, h * 0.82]];
  const glassy = L.mat(color, { roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transmission: 0.85, thickness: 0.4, ior: 1.45, transparent: false });
  L.mesh(lathe(pts), glassy, [0, 0, 0], [0, 0, 0], g);
  // liquid
  const lq = [[0.001, 0.03], [r - 0.08, 0.03], [r - 0.03, 0.08], [r - 0.03, h * liquid * 0.7], [0.001, h * liquid * 0.7]];
  L.mesh(lathe(lq), L.mat(color, { roughness: 0.2, clearcoat: 1, emissive: color, emissiveIntensity: 0.08 }), [0, 0, 0], [0, 0, 0], g);
  // label
  const lh = h * 0.3;
  L.mesh(new THREE.CylinderGeometry(r + 0.006, r + 0.006, lh, 64, 1, true, -1.1, 2.2), L.mat(label, { roughness: 0.5, side: THREE.DoubleSide }), [0, h * 0.2 + lh / 2, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(r + 0.008, r + 0.008, lh * 0.18, 64, 1, true, -1.1, 2.2), L.mat(0x5409DA, { roughness: 0.4, side: THREE.DoubleSide }), [0, h * 0.2 + lh * 0.75, 0], [0, 0, 0], g);
  // collar
  L.mesh(new THREE.CylinderGeometry(neckR + 0.06, neckR + 0.06, h * 0.07, 40), L.mat(trigger, { roughness: 0.4 }), [0, h * 0.84, 0], [0, 0, 0], g);
  // head (spray head) pointing +x
  const hd = new THREE.Group(); hd.position.set(0, h * 0.92, 0); g.add(hd);
  L.mesh(new RoundedBoxGeometry(r * 1.55, h * 0.13, neckR * 2.6, 4, 0.04), L.mat(trigger, { roughness: 0.4, clearcoat: 0.5 }), [r * 0.3, 0, 0], [0, 0, 0], hd);
  L.mesh(new THREE.CylinderGeometry(neckR * 0.9, neckR * 1.0, h * 0.1, 32), L.mat(trigger, { roughness: 0.4 }), [-r * 0.1, -h * 0.02, 0], [0, 0, 0], hd);
  L.mesh(new THREE.CylinderGeometry(neckR * 0.45, neckR * 0.55, r * 0.35, 24), L.mat(trigger, { roughness: 0.4 }), [r * 1.1, 0, 0], [0, 0, Math.PI / 2], hd);
  L.mesh(new THREE.CylinderGeometry(neckR * 0.3, neckR * 0.3, 0.02, 24), L.mat(0x222226, { roughness: 0.5 }), [r * 1.3, 0, 0], [0, 0, Math.PI / 2], hd);
  // trigger lever
  const lev = new THREE.Mesh(new RoundedBoxGeometry(0.07, h * 0.2, neckR * 1.6, 3, 0.025), L.mat(trigger, { roughness: 0.4, clearcoat: 0.5 }));
  lev.position.set(r * 0.85, -h * 0.1, 0); lev.rotation.z = 0.25; lev.castShadow = true; hd.add(lev);
  // dip tube
  L.mesh(new THREE.CylinderGeometry(0.012, 0.012, h * 0.8, 8), L.mat(0xffffff, { roughness: 0.3, transparent: true, opacity: 0.6 }), [0, h * 0.4, 0], [0, 0, 0], g);
  return g;
}
// folded microfibre cloth stack
export function clothStack(L, { w = 0.9, d = 0.7, colors = [0x5409DA], layers = 3, at = [0, 0, 0], rotY = 0, parent = L.scene }) {
  const g = new THREE.Group(); g.position.set(...at); g.rotation.y = rotY; parent.add(g);
  for (let i = 0; i < layers; i++) {
    const c = colors[i % colors.length]; const t = 0.05;
    const m = L.cloth(c);
    const ww = w * (1 - i * 0.03), dd = d * (1 - i * 0.04);
    const mesh = L.mesh(new RoundedBoxGeometry(ww, t, dd, 4, 0.022), m, [0, t / 2 + i * t * 0.96, 0], [0, i * 0.08 - 0.05, 0], g);
  }
  return g;
}
export const stoneSlab = (L, w, d) => { const h = L.slab(w, d, 0.18); return h; };
export const rbox = (L, w, h, d, m, pos, rot = [0, 0, 0], r = 0.03, parent = L.scene) => L.mesh(new RoundedBoxGeometry(w, h, d, 4, r), m, pos, rot, parent);
export { lathe, RoundedBoxGeometry };
export function foamPatch(L, { at, normal = [0, 1, 0], n = 22, rad = 0.35, size = 0.1, parent = L.scene, seed = 7, flat = 0.5 }) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const g = new THREE.Group(); g.position.set(...at); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...normal).normalize()); parent.add(g);
  const m = L.mat(0xfbfbfd, { roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color(0xdfe8ff) });
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * rad, r = size * (0.55 + rnd() * 0.8) * (1 - 0.35 * d / rad);
    const sp = L.mesh(new THREE.SphereGeometry(r, 20, 14), m, [Math.cos(a) * d, r * 0.55 + (1 - d / rad) * size * 0.5, Math.sin(a) * d], [0, 0, 0], g); sp.scale.y = flat;
  }
  return g;
}
