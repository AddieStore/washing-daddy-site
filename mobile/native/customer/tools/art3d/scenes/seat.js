import { THREE, bottle, foamPatch, lathe, RoundedBoxGeometry, rbox } from './_b.js';
export default async function (L) {
  const h = L.slab(3.0, 2.4, 0.16);
  L.cam.position.set(5.5, 4.9, 5.5); L.cam.lookAt(0, 1.0, 0); L.cam.fov = 31; L.cam.updateProjectionMatrix(); L.cam.fov = 30; L.cam.updateProjectionMatrix();
  const S = new THREE.Group(); S.position.set(-0.35, h, -0.35); S.rotation.y = 0.75; S.scale.setScalar(0.95); L.scene.add(S);
  const fab = L.mat(0x3a3d46, { roughness: 0.92, clearcoat: 0, sheen: 1, sheenColor: new THREE.Color(0x8a90a0), sheenRoughness: 0.7 });
  const fab2 = L.mat(0x2d3038, { roughness: 0.92, clearcoat: 0, sheen: 1, sheenColor: new THREE.Color(0x7a8090), sheenRoughness: 0.7 });
  const pipe = L.mat(0xFFBA08, { roughness: 0.6, clearcoat: 0 });
  // floor rails
  for (const x of [-0.42, 0.42]) { rbox(L, 0.1, 0.07, 1.25, L.mat(0x1b1b20, { roughness: 0.5 }), [x, 0.035, 0.05], [0, 0, 0], 0.025, S); rbox(L, 0.16, 0.2, 0.2, L.mat(0x1b1b20, { roughness: 0.5 }), [x, 0.15, 0.3], [0, 0, 0], 0.04, S); }
  rbox(L, 1.2, 0.1, 1.05, L.mat(0x1b1b20, { roughness: 0.5 }), [0, 0.25, 0.1], [0, 0, 0], 0.04, S);
  // cushion
  const cush = new THREE.Group(); cush.position.set(0, 0.4, 0.2); cush.rotation.x = -0.06; S.add(cush);
  rbox(L, 1.3, 0.24, 1.15, fab, [0, 0.12, 0], [0, 0, 0], 0.11, cush);
  for (const x of [-0.58, 0.58]) rbox(L, 0.22, 0.16, 1.1, fab2, [x, 0.27, 0], [0, 0, 0], 0.075, cush); // bolsters
  rbox(L, 0.86, 0.045, 1.0, fab, [0, 0.25, 0.0], [0, 0, 0], 0.02, cush);
  for (const x of [-0.14, 0.14, 0.0]) rbox(L, 0.012, 0.01, 0.95, L.mat(0x2a2c33, { roughness: 0.9 }), [x * 1.0 + (x === 0 ? 0 : 0), 0.275, 0], [0, 0, 0], 0.004, cush);
  rbox(L, 0.86, 0.012, 0.016, pipe, [0, 0.262, 0.5], [0, 0, 0], 0.005, cush);
  // backrest
  const back = new THREE.Group(); back.position.set(0, 0.5, -0.45); back.rotation.x = -0.14; S.add(back);
  rbox(L, 1.25, 1.35, 0.28, fab, [0, 0.67, 0], [0, 0, 0], 0.12, back);
  for (const x of [-0.56, 0.56]) rbox(L, 0.2, 1.2, 0.2, fab2, [x, 0.67, 0.08], [0, 0, 0], 0.08, back);
  rbox(L, 0.8, 1.15, 0.04, fab, [0, 0.68, 0.145], [0, 0, 0], 0.02, back);
  for (const x of [-0.14, 0.14]) rbox(L, 0.014, 1.05, 0.012, L.mat(0x2a2c33, { roughness: 0.9 }), [x, 0.68, 0.17], [0, 0, 0], 0.004, back);
  for (const y of [0.55, 1.05]) rbox(L, 0.8, 0.012, 0.012, L.mat(0x2a2c33, { roughness: 0.9 }), [0, y - 0.02, 0.168], [0, 0, 0], 0.004, back);
  rbox(L, 0.82, 0.014, 0.014, pipe, [0, 1.22, 0.165], [0, 0, 0], 0.005, back);
  // headrest
  for (const x of [-0.2, 0.2]) L.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 16), L.chrome(), [x, 1.42, 0], [0, 0, 0], back);
  rbox(L, 0.66, 0.38, 0.22, fab, [0, 1.68, 0.0], [0, 0, 0], 0.1, back);
  rbox(L, 0.4, 0.2, 0.03, fab2, [0, 1.68, 0.1], [0, 0, 0], 0.012, back);
  // foam patches (on cushion and backrest, local to groups)
  foamPatch(L, { at: [0.1, 0.285, 0.0], n: 55, rad: 0.4, size: 0.085, parent: cush, seed: 5 });
  foamPatch(L, { at: [-0.45, 0.32, 0.3], n: 14, rad: 0.12, size: 0.05, parent: cush, seed: 11 });
  foamPatch(L, { at: [-0.12, 0.84, 0.17], normal: [0, 0.1, 1], n: 50, rad: 0.34, size: 0.08, parent: back, seed: 9 });
  foamPatch(L, { at: [0.3, 0.45, 0.17], normal: [0, 0.1, 1], n: 12, rad: 0.1, size: 0.045, parent: back, seed: 13 });
  // shampoo bottle (translucent-ish blue with violet label)
  bottle(L, { r: 0.23, h: 0.95, color: 0x1F4FD8, capColor: 0xf4f4f6, label: 0xf7f4ee, labelAccent: 0x5409DA, neck: 0.1, at: [1.2, h, 0.65] });
  // scrub brush: oval body, bristles
  const br = new THREE.Group(); br.position.set(0.35, h, 1.0); br.rotation.y = -0.45; L.scene.add(br);
  const body = L.mesh(new RoundedBoxGeometry(0.78, 0.14, 0.32, 6, 0.07), L.mat(0xFFBA08, { roughness: 0.4, clearcoat: 0.6 }), [0, 0.2, 0], [0, 0, 0], br);
  rbox(L, 0.5, 0.05, 0.14, L.mat(0xe0a004, { roughness: 0.5 }), [0, 0.28, 0], [0, 0, 0], 0.02, br);
  const bm = L.mat(0xf1efe9, { roughness: 0.9, clearcoat: 0 }); let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 160; i++) { const x = (rnd() - 0.5) * 0.68, z = (rnd() - 0.5) * 0.24; if ((x / 0.36) ** 2 + (z / 0.13) ** 2 > 1) continue; L.mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.13, 6), bm, [x, 0.065, z], [0, 0, 0], br); }
  rbox(L, 0.76, 0.012, 0.3, L.mat(0xe9e6df, { roughness: 0.9 }), [0, 0.003, 0], [0, 0, 0], 0.005, br);
}
