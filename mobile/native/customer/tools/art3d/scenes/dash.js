import { THREE, bottle, clothStack, lathe, RoundedBoxGeometry, rbox } from './_b.js';
function rp(sh, pts, r) { const n = pts.length; for (let i = 0; i < n; i++) { const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n]; const d1 = [p0[0] - p1[0], p0[1] - p1[1]], d2 = [p2[0] - p1[0], p2[1] - p1[1]]; const l1 = Math.hypot(...d1), l2 = Math.hypot(...d2); const rr = Math.min(r, l1 / 2, l2 / 2); const a = [p1[0] + d1[0] / l1 * rr, p1[1] + d1[1] / l1 * rr], c = [p1[0] + d2[0] / l2 * rr, p1[1] + d2[1] / l2 * rr]; if (i == 0) sh.moveTo(...a); else sh.lineTo(...a); sh.quadraticCurveTo(p1[0], p1[1], ...c); } sh.closePath(); }
export default async function (L) {
  const h = L.slab(3.4, 2.6, 0.16);
  L.cam.position.set(5.0, 4.6, 5.0); L.cam.lookAt(0, 0.55, 0); L.cam.fov = 30; L.cam.updateProjectionMatrix();
  const D = new THREE.Group(); D.position.set(0.0, h, -0.55); D.rotation.y = 0.45; L.scene.add(D);
  const soft = L.mat(0x2b2b33, { roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.6 });
  const WD = 2.5;
  // body profile (z -> shape x, y -> shape y)
  const prof = new THREE.Shape(); rp(prof, [[-0.55, 0], [0.5, 0], [0.5, 0.52], [0.42, 0.7], [0.18, 0.8], [-0.2, 0.86], [-0.55, 0.86]], 0.1);
  const bg = new THREE.ExtrudeGeometry(prof, { depth: WD - 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 5, curveSegments: 12 });
  bg.translate(0, 0, -(WD - 0.1) / 2); bg.rotateY(-Math.PI / 2);
  L.mesh(bg, soft, [0, 0, 0], [0, 0, 0], D);
  // lower contrast panel (light grey) front-bottom
  rbox(L, WD - 0.1, 0.2, 0.03, L.mat(0xd9d5cf, { roughness: 0.55 }), [0, 0.2, 0.555], [0, 0, 0], 0.012, D);
  // trim stripe (gold thin)
  rbox(L, WD - 0.05, 0.02, 0.03, L.mat(0xFFBA08, { metalness: 0.6, roughness: 0.3 }), [0, 0.39, 0.57], [0, 0, 0], 0.01, D);
  // centre vent strip
  const vent = new THREE.Group(); vent.position.set(0.3, 0.2, 0.585); vent.rotation.x = 0; D.add(vent);
  rbox(L, 1.1, 0.14, 0.04, L.mat(0x15151a, { roughness: 0.5 }), [0, 0, 0], [0, 0, 0], 0.03, vent);
  for (let i = 0; i < 9; i++) rbox(L, 0.008, 0.1, 0.02, L.chrome(), [-0.45 + i * 0.113, 0, 0.02], [0, 0, 0], 0.003, vent);
  // round side vents
  for (const x of [1.12]) { L.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 40), L.mat(0x15151a, { roughness: 0.5 }), [x, 0.2, 0.58], [Math.PI / 2, 0, 0], D); L.mesh(new THREE.TorusGeometry(0.1, 0.014, 12, 40), L.chrome(), [x, 0.2, 0.6], [0, 0, 0], D); }
  // instrument hood + cluster (driver side, -x)
  const cl = new THREE.Group(); cl.position.set(-0.7, 0.86, 0.12); D.add(cl);
  rbox(L, 0.95, 0.12, 0.55, L.mat(0x1b1b21, { roughness: 0.55 }), [0, 0.0, 0], [0, 0, 0], 0.05, cl);
  const face = new THREE.Group(); face.position.set(0, -0.02, 0.28); face.rotation.x = -0.15; cl.add(face);
  const faceM = L.mat(0x0f1015, { roughness: 0.25, clearcoat: 1 });
  rbox(L, 0.88, 0.3, 0.06, faceM, [0, 0, 0], [0, 0, 0], 0.04, face);
  for (const x of [-0.22, 0.22]) {
    L.mesh(new THREE.TorusGeometry(0.115, 0.012, 12, 48), L.chrome(), [x, 0, 0.032], [0, 0, 0], face);
    L.mesh(new THREE.CircleGeometry(0.105, 40), L.mat(0x1b1d29, { roughness: 0.3, clearcoat: 1 }), [x, 0, 0.034], [0, 0, 0], face);
    L.mesh(new THREE.TorusGeometry(0.085, 0.006, 8, 40, 4.4), L.mat(0xFFBA08, { roughness: 0.4, emissive: 0xFFBA08, emissiveIntensity: 0.25 }), [x, 0, 0.037], [0, 0, -0.6 - Math.PI / 2 - 0.0], face);
    L.mesh(new THREE.BoxGeometry(0.008, 0.09, 0.006), L.mat(0xff4d3a, { roughness: 0.4 }), [x + 0.02, 0.03, 0.04], [0, 0, -0.6], face);
    L.mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 16), L.chrome(), [x, 0, 0.042], [Math.PI / 2, 0, 0], face);
  }
  // steering wheel
  const sw = new THREE.Group(); sw.position.set(-0.7, 0.55, 1.1); sw.rotation.x = -0.4; D.add(sw);
  const leather = L.mat(0x1d1d22, { roughness: 0.55, clearcoat: 0.25 });
  L.mesh(new THREE.TorusGeometry(0.46, 0.055, 24, 80), leather, [0, 0, 0], [0, 0, 0], sw);
  L.mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.1, 40), L.mat(0x24242a, { roughness: 0.4, clearcoat: 0.6 }), [0, 0, 0.02], [Math.PI / 2, 0, 0], sw);
  L.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 32), L.mat(0xFFBA08, { metalness: 0.8, roughness: 0.3 }), [0, 0, 0.075], [Math.PI / 2, 0, 0], sw);
  for (const a of [Math.PI, 0, -Math.PI / 2]) { const sp = new THREE.Group(); sp.rotation.z = a; sw.add(sp); L.mesh(new RoundedBoxGeometry(0.34, 0.075, 0.045, 3, 0.02), L.mat(0x2a2a30, { roughness: 0.4, clearcoat: 0.5 }), [0.27, 0, 0], [0, 0, 0], sp); }
  L.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 24), L.mat(0x15151a, { roughness: 0.6 }), [0, -0.12, -0.28], [Math.PI / 2 - 0.0, 0, 0], sw);
  // polish bottle + cloth
  bottle(L, { r: 0.26, h: 1.0, color: 0x5409DA, capColor: 0xFFBA08, label: 0xf7f4ee, labelAccent: 0x5409DA, neck: 0.1, at: [1.35, h, 0.85] });
  clothStack(L, { w: 0.85, d: 0.65, colors: [0xFFBA08, 0xf4efe6, 0x5409DA], layers: 3, at: [0.35, h, 0.95], rotY: -0.35 });
}
