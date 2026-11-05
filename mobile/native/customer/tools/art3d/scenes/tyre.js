import { THREE, bottle, clothStack, lathe, RoundedBoxGeometry, rbox } from './_b.js';
export default async function (L) {
  const h = L.slab(3.1, 2.4, 0.16);
  L.cam.position.set(5.2, 4.3, 5.2); L.cam.lookAt(0.0, 0.8, 0.05); L.cam.fov=29;L.cam.updateProjectionMatrix();
  const wheel = new THREE.Group(); const S = 0.9; wheel.scale.setScalar(S);
  wheel.position.set(-0.35, h + 1.0 * S, -0.25); wheel.rotation.y = 0.62; L.scene.add(wheel);
  const ax = new THREE.Group(); ax.rotation.x = Math.PI / 2; wheel.add(ax); // lathe axis Y -> Z
  // tyre profile (r, y) y along axis; width 0.62
  const W = 0.31, P = [];
  P.push([0.66, -W * 0.82], [0.70, -W * 0.96], [0.76, -W], [0.86, -W * 0.97], [0.93, -W * 0.9], [0.985, -W * 0.72], [1.0, -W * 0.5]);
  // tread with grooves
  const nT = 4; const tr = 1.0;
  P.push([tr + 0.008, -W * 0.46]);
  for (let i = 0; i < nT; i++) { const a = -W * 0.4 + i * (W * 0.8 / (nT - 1)); }
  P.push([tr, -W * 0.34], [tr - 0.03, -W * 0.3], [tr - 0.03, -W * 0.2], [tr, -W * 0.16], [tr, -W * 0.04], [tr - 0.03, 0], [tr - 0.03, W * 0.1], [tr, W * 0.14], [tr, W * 0.3], [tr - 0.03, W * 0.34], [tr - 0.03, W * 0.4], [tr + 0.008, W * 0.46]);
  P.push([1.0, W * 0.5], [0.985, W * 0.72], [0.93, W * 0.9], [0.86, W * 0.97], [0.76, W], [0.70, W * 0.96], [0.66, W * 0.82]);
  const tyreMat = L.mat(0x1c1c20, { roughness: 0.82, clearcoat: 0, sheen: 0.3 });
  L.mesh(lathe(P.map(p => [p[0], p[1]]), 128), tyreMat, [0, 0, 0], [0, 0, 0], ax);
  // sidewall ridges (front)
  for (const [rr, w] of [[0.8, 0.012], [0.9, 0.01]]) L.mesh(new THREE.TorusGeometry(rr, w, 8, 128), tyreMat, [0, 0, W * 0.985 - (rr > 0.85 ? 0.04 : 0)], [0, 0, 0], wheel);
  // gloss sidewall highlight ring (tyre shine)
  L.mesh(new THREE.TorusGeometry(0.74, 0.008, 8, 128), L.mat(0x2d2d33, { roughness: 0.4 }), [0, 0, W * 0.97], [0, 0, 0], wheel);
  // rim barrel + lip
  const alloy = L.mat(0xa4a9b1, { metalness: 1, roughness: 0.14, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  const rimP = [[0.58, -W * 0.8], [0.62, -W * 0.82], [0.665, -W * 0.7], [0.67, -W * 0.5], [0.6, -W * 0.45], [0.56, -W * 0.3], [0.56, W * 0.5], [0.62, W * 0.6], [0.67, W * 0.78], [0.675, W * 0.84], [0.655, W * 0.9], [0.63, W * 0.84]];
  L.mesh(lathe(rimP, 96), alloy, [0, 0, 0], [0, 0, 0], ax);
  // dark inner well
  L.mesh(new THREE.CylinderGeometry(0.575, 0.575, 0.1, 64), L.mat(0x0d0d10, { roughness: 0.7 }), [0, 0, -0.15], [Math.PI / 2, 0, 0], wheel);
  // brake disc
  L.mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 64), L.mat(0x8c8f94, { metalness: 1, roughness: 0.4 }), [0, 0, -0.05], [Math.PI / 2, 0, 0], wheel);
  L.mesh(new THREE.TorusGeometry(0.4, 0.015, 8, 64), L.mat(0x6c6f74, { metalness: 1, roughness: 0.5 }), [0, 0, -0.05], [0, 0, 0], wheel);
  // caliper (violet accent)
  const cal = L.mat(0x5409DA, { roughness: 0.3, clearcoat: 1 });
  const caliper = rbox(L, 0.3, 0.28, 0.2, cal, [0.38, 0.2, -0.08], [0, 0, -0.5], 0.06, wheel); 
  // spokes: tapered extrude, 5 spokes
  const sp = new THREE.Shape(); sp.moveTo(-0.07, 0.12); sp.lineTo(0.07, 0.12); sp.quadraticCurveTo(0.05, 0.35, 0.13, 0.58); sp.quadraticCurveTo(0, 0.63, -0.13, 0.58); sp.quadraticCurveTo(-0.05, 0.35, -0.07, 0.12); sp.closePath();
  const spG = new THREE.ExtrudeGeometry(sp, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 4, curveSegments: 12 });
  const hole = new THREE.Shape(); 
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; const s = new THREE.Mesh(spG, alloy); s.castShadow = true; s.receiveShadow = true; const pv = new THREE.Group(); pv.rotation.z = a; s.position.z = W * 0.18; pv.add(s); wheel.add(pv); }
  // hub disc + center cap
  L.mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 48), alloy, [0, 0, W * 0.25], [Math.PI / 2, 0, 0], wheel);
  L.mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.06, 40), L.mat(0x1c1c20, { roughness: 0.4, clearcoat: 1 }), [0, 0, W * 0.34], [Math.PI / 2, 0, 0], wheel);
  L.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 32), L.mat(0xFFBA08, { metalness: 0.8, roughness: 0.3 }), [0, 0, W * 0.375], [Math.PI / 2, 0, 0], wheel);
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 + Math.PI / 5; L.mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.05, 6), L.mat(0xe4e6ea, { metalness: 1, roughness: 0.25 }), [Math.cos(a) * 0.15, Math.sin(a) * 0.15, W * 0.32], [Math.PI / 2, 0, 0], wheel); }
  // valve
  L.mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 12), L.mat(0xe4e6ea, { metalness: 1, roughness: 0.3 }), [0.0, -0.6, W * 0.7], [Math.PI / 2, 0, 0], wheel);
  // shiny tyre gel bottle
  bottle(L, { r: 0.27, h: 1.05, color: 0x15151a, capColor: 0x5409DA, label: 0xf3f0ea, labelAccent: 0x5409DA, neck: 0.1, at: [1.15, h, 0.45] });
  // sponge applicator pad (dome) + small foam block
  const pad = new THREE.Group(); pad.position.set(0.5, h, 0.95); pad.rotation.y = -0.4; L.scene.add(pad);
  L.mesh(new RoundedBoxGeometry(0.62, 0.2, 0.42, 6, 0.09), L.mat(0xf2d5a0, { roughness: 0.95, clearcoat: 0, sheen: 0.4 }), [0, 0.1, 0], [0, 0, 0], pad);
  L.mesh(new RoundedBoxGeometry(0.64, 0.1, 0.44, 6, 0.045), L.mat(0x1F4FD8, { roughness: 0.9, clearcoat: 0, sheen: 0.5 }), [0, 0.25, 0], [0, 0, 0], pad);
  L.mesh(new RoundedBoxGeometry(0.64, 0.02, 0.44, 4, 0.01), L.mat(0x141414, { roughness: 0.95, clearcoat: 0 }), [0, 0.2, 0], [0, 0, 0], pad);
  // cloth at left
  clothStack(L, { w: 0.8, d: 0.6, colors: [0x5409DA, 0xe9e4f5, 0x5409DA], layers: 3, at: [-1.1, h, 0.8], rotY: 0.3 });
}
