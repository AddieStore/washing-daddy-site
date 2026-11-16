import { THREE, sprayBottle, clothStack, RoundedBoxGeometry, rbox } from './_b.js';
function rp(sh, pts, r) { const n = pts.length; for (let i = 0; i < n; i++) { const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n]; const d1 = [p0[0] - p1[0], p0[1] - p1[1]], d2 = [p2[0] - p1[0], p2[1] - p1[1]]; const l1 = Math.hypot(...d1), l2 = Math.hypot(...d2); const a = [p1[0] + d1[0] / l1 * r, p1[1] + d1[1] / l1 * r], c = [p1[0] + d2[0] / l2 * r, p1[1] + d2[1] / l2 * r]; if (i == 0) sh.moveTo(...a); else sh.lineTo(...a); sh.quadraticCurveTo(p1[0], p1[1], ...c); } sh.closePath(); }
const trap = (wb, wt, h, x0 = 0, y0 = 0) => [[x0 - wb / 2, y0], [x0 + wb / 2, y0], [x0 + wt / 2, y0 + h], [x0 - wt / 2, y0 + h]];
export default async function (L) {
  const h = L.slab(3.0, 2.3, 0.16);
  L.cam.position.set(4.9, 4.4, 4.9); L.cam.lookAt(0, 0.55, 0); L.cam.fov = 30; L.cam.updateProjectionMatrix();
  const g = new THREE.Group(); g.position.set(-0.1, h, -0.55); g.rotation.y = 0.5; L.scene.add(g);
  const tilt = new THREE.Group(); tilt.rotation.x = -0.5; g.add(tilt); // lean back
  const W = 2.5, H = 1.45, WT = 1.95;
  // windshield trapezoid-ish: rounded rect
  const outer = new THREE.Shape(); rp(outer, trap(W, WT, H), 0.28);
  const inner = new THREE.Path(); const ins = 0.09; const ip = new THREE.Shape(); rp(ip, trap(W - 0.24, WT - 0.2, H - 0.16, 0, ins), 0.18); outer.holes.push(new THREE.Path(ip.getPoints(24).reverse()));
  const frameG = new THREE.ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 4, curveSegments: 16 });
  L.mesh(frameG, L.mat(0x1b1b20, { roughness: 0.6, clearcoat: 0.2 }), [0, 0, -0.035], [0, 0, 0], tilt);
  // glass
  const gs = new THREE.Shape(); rp(gs, trap(W - 0.16, WT - 0.12, H - 0.09, 0, 0.045), 0.2);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xbfe0f2, metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, transparent: true, opacity: 0.38, envMapIntensity: 2.2, side: THREE.DoubleSide });
  const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth: 0.03, bevelEnabled: false, curveSegments: 16 }), glassMat); gm.position.z = -0.015; gm.receiveShadow = true; tilt.add(gm);
  // top tint band
  const band = new THREE.Shape(); band.moveTo(-WT / 2 - 0.1, H - 0.3); band.lineTo(WT / 2 + 0.1, H - 0.3); band.lineTo(WT / 2 - 0.12, H - 0.15); band.lineTo(-WT / 2 + 0.12, H - 0.15); band.closePath();
  const bm = new THREE.Mesh(new THREE.ShapeGeometry(band), new THREE.MeshBasicMaterial({ color: 0x3b6fc4, transparent: true, opacity: 0.35 })); bm.position.z = 0.02; tilt.add(bm);
  // reflection streaks
  for (const [x0, w0, o] of [[-0.7, 0.2, 0.26], [-0.3, 0.06, 0.2], [0.5, 0.26, 0.14]]) {
    const st = new THREE.Shape(); st.moveTo(x0, 0.14); st.lineTo(x0 + w0, 0.14); st.lineTo(x0 + w0 + 0.3, H - 0.32); st.lineTo(x0 + 0.3, H - 0.32); st.closePath();
    const sm = new THREE.Mesh(new THREE.ShapeGeometry(st), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: o, depthWrite: false })); sm.position.z = 0.019; tilt.add(sm);
  }
  // droplets on glass
  const drop = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transmission: 0.0, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 2 });
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) { const s = 0.015 + rnd() * 0.03; const m = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), drop); m.scale.z = 0.4; m.position.set((rnd() - 0.5) * (WT - 0.5), 0.2 + rnd() * (H - 0.7), 0.025); m.scale.y = 1.15; tilt.add(m); }
  // support feet
  for (const x of [-0.8, 0.8]) rbox(L, 0.22, 0.09, 0.3, L.mat(0x1b1b20, { roughness: 0.6 }), [x, 0.04, 0.0], [0, 0, 0], 0.03, g);
  // squeegee: handle + blade holder + rubber, lying on slab front
  const sq = new THREE.Group(); sq.position.set(0.55, h, 0.95); sq.rotation.y = 0.5; L.scene.add(sq);
  rbox(L, 0.95, 0.09, 0.14, L.mat(0x5409DA, { roughness: 0.35, clearcoat: 0.7 }), [0, 0.085, 0], [0, 0, 0], 0.04, sq); // holder
  rbox(L, 0.93, 0.045, 0.045, L.mat(0x1b1b20, { roughness: 0.9 }), [0, 0.02, 0.0], [0, 0, 0], 0.015, sq); // rubber
  rbox(L, 0.3, 0.11, 0.17, L.mat(0xf1f1f4, { roughness: 0.45, clearcoat: 0.5 }), [0, 0.16, 0], [0, 0, 0], 0.05, sq); // neck
  const hnd = L.mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.8, 32), L.mat(0xFFBA08, { roughness: 0.45, clearcoat: 0.6 }), [0.0, 0.12, -0.52], [Math.PI / 2, 0, 0], sq);
  L.mesh(new THREE.SphereGeometry(0.07, 24, 16), L.mat(0xFFBA08, { roughness: 0.45, clearcoat: 0.6 }), [0, 0.12, -0.92], [0, 0, 0], sq);
  // spray bottle
  sprayBottle(L, { r: 0.26, h: 1.3, color: 0x7fc1ef, at: [1.2, h, 0.6], rot: [0, -0.7, 0] });
  // cloth
  clothStack(L, { w: 0.75, d: 0.6, colors: [0xe9e4f5, 0x5409DA, 0xe9e4f5], layers: 3, at: [-1.15, h, 0.2], rotY: 0.5 });
}
