// Better product car. makeCar(L, color, at, s, opts) -> Group. Forward = +x, length ~3.1, ground y=0 at group origin.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export function makeWheel(L, R = 0.31) {
  const g = new THREE.Group();
  const tp = []; // tyre profile (lathe around Y axis): r, y
  const W = 0.12;
  tp.push(new THREE.Vector2(R * 0.62, -W)); tp.push(new THREE.Vector2(R * 0.9, -W)); tp.push(new THREE.Vector2(R * 0.98, -W * 0.7)); tp.push(new THREE.Vector2(R, -W * 0.25));
  tp.push(new THREE.Vector2(R, W * 0.25)); tp.push(new THREE.Vector2(R * 0.98, W * 0.7)); tp.push(new THREE.Vector2(R * 0.9, W)); tp.push(new THREE.Vector2(R * 0.62, W));
  tp.push(new THREE.Vector2(R * 0.6, 0)); tp.push(new THREE.Vector2(R * 0.62, -W));
  const tyre = new THREE.Mesh(new THREE.LatheGeometry(tp, 48), L.mat(0x17171a, { roughness: 0.9, clearcoat: 0 })); tyre.castShadow = true; g.add(tyre);
  const alloy = L.mat(0xcfd3d9, { metalness: 1, roughness: 0.25, clearcoat: 0.2 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.62, R * 0.04, 12, 48), alloy); rim.rotation.x = Math.PI / 2; rim.position.y = W; g.add(rim);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.6, R * 0.6, 0.02, 40), L.mat(0x2a2c31, { metalness: 0.8, roughness: 0.5 })); face.position.y = W * 0.85; g.add(face);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2; const sp = new THREE.Mesh(new RoundedBoxGeometry(R * 0.5, 0.03, R * 0.16, 2, 0.012), alloy); sp.position.set(Math.cos(a) * R * 0.33, W + 0.005, Math.sin(a) * R * 0.33); sp.rotation.y = -a; g.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.16, R * 0.16, 0.05, 24), alloy); hub.position.y = W + 0.01; g.add(hub);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.08, R * 0.08, 0.06, 16), L.mat(0x5409DA, { roughness: 0.3 })); cap.position.y = W + 0.02; g.add(cap);
  g.rotation.x = Math.PI / 2; // axis along z
  const o = new THREE.Group(); o.add(g); return o;
}
export function makeCar(L, color = 0x2b2f36, at = [0, 0.18, 0], s = 1, opts = {}) {
  const { mat, scene } = L;
  const root = new THREE.Group(); root.position.set(...at); root.scale.setScalar(s); scene.add(root);
  const paint = mat(color, { metalness: opts.metalness ?? 0.55, roughness: opts.roughness ?? 0.3, clearcoat: 1, clearcoatRoughness: 0.04 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x151d2a, metalness: 0.3, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02 });
  const dark = mat(0x0d0e11, { roughness: 0.8, clearcoat: 0 });
  const trim = L.chrome();
  const add = (geo, m, p = [0, 0, 0], r = [0, 0, 0]) => { const x = new THREE.Mesh(geo, m); x.position.set(...p); x.rotation.set(...r); x.castShadow = x.receiveShadow = true; root.add(x); return x; };
  const WZ = 0.74; // body half width
  // ---- lower body
  const sh = new THREE.Shape(); const wx = [-0.93, 0.95], wy = 0.31, ar = 0.385, by = 0.17;
  sh.moveTo(-1.5, by);
  const d = Math.sqrt(ar * ar - (wy - by) ** 2), a0 = Math.atan2(by - wy, -d), a1 = Math.atan2(by - wy, d);
  sh.lineTo(wx[0] - d, by); sh.absarc(wx[0], wy, ar, a0, a1, true);
  sh.lineTo(wx[1] - d, by); sh.absarc(wx[1], wy, ar, a0, a1, true);
  sh.lineTo(1.46, by); sh.quadraticCurveTo(1.56, by + 0.02, 1.56, 0.36);
  sh.quadraticCurveTo(1.57, 0.55, 1.5, 0.64); sh.quadraticCurveTo(1.38, 0.72, 1.0, 0.75); sh.lineTo(0.6, 0.79);
  sh.lineTo(-1.2, 0.8); sh.quadraticCurveTo(-1.5, 0.79, -1.56, 0.7); sh.quadraticCurveTo(-1.6, 0.5, -1.57, 0.32); sh.quadraticCurveTo(-1.56, by, -1.5, by);
  const bevel = 0.1;
  const gb = new THREE.ExtrudeGeometry(sh, { depth: WZ * 2 - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 6, curveSegments: 40 });
  gb.translate(0, 0, -(WZ - bevel)); add(gb, paint);
  // wheel wells + wheels
  for (const x of wx) {
    add(new THREE.CylinderGeometry(ar * 0.98, ar * 0.98, 1.0, 32), dark, [x, wy, 0], [Math.PI / 2, 0, 0]);
    for (const z of [-1, 1]) { const w = makeWheel(L, 0.31); w.position.set(x, wy, z * 0.585); w.scale.z = z; root.add(w); w.traverse(o => { o.castShadow = true; }); }
  }
  // sills / lower dark skirt
  add(new RoundedBoxGeometry(1.2, 0.06, 1.52, 2, 0.02), dark, [0.0, 0.2, 0]);
  // ---- greenhouse
  const gh = new THREE.Shape(); gh.moveTo(0.66, 0.78); gh.lineTo(0.16, 1.26); gh.quadraticCurveTo(0.1, 1.32, 0.0, 1.32); gh.lineTo(-0.62, 1.32); gh.quadraticCurveTo(-0.72, 1.32, -0.78, 1.26); gh.lineTo(-1.22, 0.8); gh.closePath();
  const gg = new THREE.ExtrudeGeometry(gh, { depth: 1.2 - 0.12, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.06, bevelSegments: 4, curveSegments: 16 });
  gg.translate(0, 0, -(0.6 - 0.06)); add(gg, glassM);
  // roof
  add(new RoundedBoxGeometry(0.98, 0.08, 1.22, 4, 0.035), paint, [-0.24, 1.385, 0]);
  // pillars
  const pil = (p, q, z, r) => { const a = new THREE.Vector3(p[0], p[1], z), b = new THREE.Vector3(q[0], q[1], z); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10), paint); m.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); m.castShadow = true; root.add(m); };
  for (const z of [-0.63, 0.63]) { pil([0.68, 0.78], [0.18, 1.3], z, 0.035); pil([-0.8, 1.3], [-1.24, 0.8], z, 0.06); pil([-0.3, 0.8], [-0.3, 1.31], z, 0.03); pil([0.68, 0.8], [-1.24, 0.8], z, 0.025); }
  // door seams + handles
  for (const z of [-1, 1]) {
    for (const x of [0.58, -0.3, -0.98]) add(new THREE.BoxGeometry(0.012, 0.42, 0.01), dark, [x, 0.57, z * (WZ + 0.002)]);
    for (const x of [0.2, -0.45]) add(new RoundedBoxGeometry(0.17, 0.03, 0.03, 2, 0.012), trim, [x, 0.7, z * (WZ + 0.012)]);
    add(new RoundedBoxGeometry(0.1, 0.1, 0.12, 3, 0.04), paint, [0.62, 0.86, z * 0.82]); // mirror
    add(new THREE.BoxGeometry(2.2, 0.012, 0.006), dark, [-0.05, 0.62, z * (WZ + 0.002)]);
    // lights
    add(new RoundedBoxGeometry(0.1, 0.1, 0.32, 3, 0.04), mat(0xfff6d8, { emissive: 0xfff0c0, emissiveIntensity: 0.5, roughness: 0.1, clearcoat: 1 }), [1.64, 0.56, z * 0.5]);
    add(new RoundedBoxGeometry(0.06, 0.09, 0.34, 3, 0.03), mat(0xb3111f, { emissive: 0x7a0010, emissiveIntensity: 0.5, roughness: 0.15, clearcoat: 1 }), [-1.66, 0.6, z * 0.5]);
  }
  add(new RoundedBoxGeometry(0.05, 0.12, 0.62, 3, 0.02), dark, [1.66, 0.46, 0]); // grille
  add(new RoundedBoxGeometry(0.1, 0.1, 1.0, 3, 0.04), dark, [1.63, 0.28, 0]); // lower intake
  add(new RoundedBoxGeometry(0.06, 0.08, 0.36, 2, 0.02), mat(0xdfe2e6, { roughness: 0.6 }), [-1.67, 0.34, 0]); // plate
  return root;
}
