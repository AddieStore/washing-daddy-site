import { THREE, bottle, lathe, RoundedBoxGeometry, rbox } from './_b.js';
export default async function (L) {
  const h = L.slab(3.2, 2.5, 0.16);
  L.cam.position.set(5.0, 4.5, 5.0); L.cam.lookAt(0, 0.75, 0); L.cam.fov = 30; L.cam.updateProjectionMatrix();
  const D = new THREE.Group(); D.position.set(-0.1, h, -0.45); D.rotation.y = 0.5; L.scene.add(D);
  const soft = L.mat(0x2b2b33, { roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.6 });
  // dash section: upright panel with a sloped top
  const prof = new THREE.Shape(); prof.moveTo(-0.3, 0); prof.lineTo(0.3, 0); prof.lineTo(0.3, 1.15); prof.quadraticCurveTo(0.3, 1.35, 0.1, 1.38); prof.lineTo(-0.3, 1.38); prof.closePath();
  const bg = new THREE.ExtrudeGeometry(prof, { depth: 1.9, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 5, curveSegments: 12 });
  bg.translate(0, 0, -0.95); bg.rotateY(-Math.PI / 2); // shape x -> world z (front is +z)
  L.mesh(bg, soft, [0, 0, 0], [0, 0, 0], D);
  const FZ = 0.37; // front face plane
  // light grey trim band
  rbox(L, 1.8, 0.12, 0.03, L.mat(0xd9d5cf, { roughness: 0.55 }), [0, 0.2, FZ], [0, 0, 0], 0.012, D);
  rbox(L, 1.8, 0.018, 0.03, L.mat(0xFFBA08, { metalness: 0.6, roughness: 0.3 }), [0, 0.3, FZ], [0, 0, 0], 0.008, D);
  // main AC vent: chrome frame, dark interior, louvres
  const v = new THREE.Group(); v.position.set(0, 0.8, FZ); D.add(v);
  rbox(L, 1.3, 0.46, 0.05, L.mat(0xc9ccd2, { metalness: 1, roughness: 0.2 }), [0, 0, 0.0], [0, 0, 0], 0.05, v);
  rbox(L, 1.2, 0.36, 0.06, L.mat(0x0d0d10, { roughness: 0.6 }), [0, 0, 0.012], [0, 0, 0], 0.035, v);
  const louv = L.mat(0x25262c, { roughness: 0.4, clearcoat: 0.4 });
  for (let i = 0; i < 4; i++) rbox(L, 1.14, 0.045, 0.08, louv, [0, -0.13 + i * 0.087, 0.05], [-0.28, 0, 0], 0.02, v);
  rbox(L, 0.02, 0.32, 0.05, louv, [-0.3, 0, 0.04], [0, 0, 0], 0.008, v);
  rbox(L, 0.02, 0.32, 0.05, louv, [0.45, 0, 0.04], [0, 0, 0], 0.008, v);
  rbox(L, 0.14, 0.04, 0.05, L.chrome(), [0.0, 0.0, 0.1], [0, 0, 0], 0.015, v); // slider knob
  // round side vent
  const rv = new THREE.Group(); rv.position.set(-0.65 + 0, 0.0, 0.0); 
  const sv = new THREE.Group(); sv.position.set(0.65 * 1.0 + 0.0, 0.8 + 0.0, FZ); 
  // clip-on freshener on 2nd louvre: clip arms behind louvre + stem + disc
  const cf = new THREE.Group(); cf.position.set(0.18, 0.0, 0.1); v.add(cf);
  rbox(L, 0.1, 0.012, 0.16, L.mat(0xf4f4f6, { roughness: 0.4 }), [0, 0.03, 0.0], [-0.28, 0, 0], 0.005, cf);
  rbox(L, 0.1, 0.012, 0.16, L.mat(0xf4f4f6, { roughness: 0.4 }), [0, -0.025, -0.02], [-0.28, 0, 0], 0.005, cf);
  rbox(L, 0.06, 0.012, 0.04, L.mat(0xf4f4f6, { roughness: 0.4 }), [0, 0.0, 0.08], [-0.28, 0, 0], 0.005, cf);
  rbox(L, 0.07, 0.04, 0.05, L.mat(0xf4f4f6, { roughness: 0.4 }), [0, 0, 0.1], [0, 0, 0], 0.012, cf);
  // disc (the scented pad)
  const disc = new THREE.Group(); disc.position.set(0, -0.0, 0.2); disc.rotation.x = 0.1; cf.add(disc);
  L.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 56), L.mat(0x5409DA, { roughness: 0.5, clearcoat: 0.4 }), [0, 0, 0], [Math.PI / 2, 0, 0], disc);
  L.mesh(new THREE.TorusGeometry(0.2, 0.012, 12, 56), L.mat(0xf4f4f6, { roughness: 0.4 }), [0, 0, 0.0], [0, 0, 0], disc);
  L.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 40), L.mat(0xFFBA08, { roughness: 0.4, clearcoat: 0.5 }), [0, 0, 0.028], [Math.PI / 2, 0, 0], disc);
  L.mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 32), L.mat(0xf7f4ee, { roughness: 0.4 }), [0, 0, 0.037], [Math.PI / 2, 0, 0], disc);
  // diffuser bottle: square-ish glass jar with reeds
  const g = new THREE.Group(); g.position.set(-1.05, h, 0.55); g.rotation.y = -0.3; L.scene.add(g);
  const glassM = L.mat(0xc9b6f2, { roughness: 0.06, clearcoat: 1, transmission: 0.7, thickness: 0.4, ior: 1.45 });
  L.mesh(new RoundedBoxGeometry(0.46, 0.55, 0.46, 6, 0.12), glassM, [0, 0.28, 0], [0, 0, 0], g);
  L.mesh(new RoundedBoxGeometry(0.4, 0.38, 0.4, 6, 0.1), L.mat(0x7a45f0, { roughness: 0.2, clearcoat: 1, emissive: 0x5409DA, emissiveIntensity: 0.12 }), [0, 0.22, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 32), glassM, [0, 0.6, 0], [0, 0, 0], g);
  L.mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 32), L.mat(0xFFBA08, { metalness: 0.8, roughness: 0.3 }), [0, 0.67, 0], [0, 0, 0], g);
  const reed = L.mat(0xd8b684, { roughness: 0.8, clearcoat: 0 });
  for (let i = 0; i < 6; i++) { const a = i * 1.05, t = 0.12 + (i % 3) * 0.04; const r = L.mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.8, 8), reed, [Math.cos(a) * 0.015 + Math.cos(a) * t * 0.5, 0.95, Math.sin(a) * 0.015 + Math.sin(a) * t * 0.6], [Math.sin(a) * -t, 0, Math.cos(a) * t], g); }
  // second smaller bottle (room spray / oil)
  bottle(L, { r: 0.2, h: 0.75, color: 0xf1ece4, capColor: 0xFFBA08, label: 0x5409DA, labelAccent: 0xFFBA08, neck: 0.08, at: [1.3, h, 0.75] });
}
