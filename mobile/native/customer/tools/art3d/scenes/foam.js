import { H } from './_a.js';
export default async function (L) {
  const { T, grp, lathe, smooth, foamBlob, bottle } = H(L), { mat, mesh } = L;
  const sh = L.slab(3.6, 2.8, 0.18);
  L.cam.position.set(6.3, 5.9, 6.7); L.cam.lookAt(0, 0.8, 0);
  // door panel standing on slab, rear-left, angled
  const d = grp([-0.55, sh, -0.45], [0, 0.72, 0]);
  const paint = mat(0x1F4FD8, { metalness: 0.5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
  mesh(new L.RoundedBoxGeometry(2.4, 1.15, 0.16, 6, 0.07), paint, [0, 0.62, 0], [0, 0, 0], d);
  mesh(new L.RoundedBoxGeometry(2.1, 0.55, 0.12, 5, 0.05), new T.MeshPhysicalMaterial({ color: 0x141c28, roughness: 0.04, clearcoat: 1, metalness: 0.2 }), [0.05, 1.4, 0], [0, 0, 0], d);
  mesh(new L.RoundedBoxGeometry(2.2, 0.06, 0.14, 3, 0.03), L.chrome(), [0.05, 1.14, 0], [0, 0, 0], d);
  mesh(new L.RoundedBoxGeometry(0.42, 0.07, 0.07, 3, 0.03), L.chrome(), [0.55, 0.9, 0.12], [0, 0, 0], d);
  mesh(new L.RoundedBoxGeometry(0.1, 0.13, 0.04, 3, 0.02), L.chrome(), [0.4, 0.9, 0.09], [0, 0, 0], d);
  mesh(new L.RoundedBoxGeometry(2.4, 0.04, 0.18, 3, 0.02), L.rubber(), [0, 0.06, 0], [0, 0, 0], d);
  // foam: heavy on face + top of door
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const fm = mat(0xffffff, { roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.5, sheen: 0.5, sheenColor: new T.Color(0xcfe0ff) });
  const sp = (x, y, z, r) => mesh(new T.SphereGeometry(r, 20, 16), fm, [x, y, z], [0, 0, 0], d);
  const slabF = mesh(new L.RoundedBoxGeometry(2.36, 0.62, 0.3, 8, 0.14), fm, [0, 0.93, 0.07], [0, 0, 0], d);
  for (let i = 0; i < 70; i++) { const x = (rnd() - .5) * 2.3, y = 0.66 + rnd() * 0.56; sp(x, y, 0.2 + rnd() * 0.05, 0.08 + rnd() * 0.1) }
  for (let i = 0; i < 40; i++) sp((rnd() - .5) * 2.3, 1.18 + rnd() * 0.04, (rnd() - .5) * 0.22 + 0.06, 0.09 + rnd() * 0.08);
  // drips
  for (let i = 0; i < 12; i++) { const x = (rnd() - .5) * 2.1, h = 0.15 + rnd() * 0.4; mesh(new T.CapsuleGeometry(0.055, h, 8, 12), fm, [x, 0.66 - h / 2, 0.2], [0, 0, 0], d); sp(x, 0.66 - h, 0.2, 0.075) }
  // foam pile on slab at base
  foamBlob([-0.1, sh, 0.35], { r: 0.55, n: 70, s: 0.09, flat: 0.4 });
  // foam cannon: clear bottle + brass head
  const c = grp([1.3, sh, 0.8], [0, -0.6, 0]); c.scale.setScalar(0.85);
  lathe(smooth([[0, 0], [0.34, 0], [0.38, 0.08], [0.38, 1.0], [0.3, 1.18], [0.17, 1.25]], 5), new T.MeshPhysicalMaterial({ color: 0xdfe6f5, roughness: 0.1, transmission: 0.25, thickness: 0.6, ior: 1.4, clearcoat: 1 }), [0, 0, 0], [0, 0, 0], c);
  lathe([[0, 0], [0.34, 0], [0.38, 0.05], [0.38, 0.55], [0.36, 0.6], [0, 0.6]], mat(0xeaeaff, { roughness: 0.15, transmission: 0.2, clearcoat: 1 }), [0, 0.1, 0], [0, 0, 0], c);
  const brass = mat(0xd6a548, { metalness: 1, roughness: 0.3, clearcoat: 0.3 });
  lathe([[0, 0], [0.22, 0], [0.22, 0.14], [0.17, 0.16], [0, 0.16]], brass, [0, 1.22, 0], [0, 0, 0], c);
  mesh(new T.CylinderGeometry(0.1, 0.1, 0.42, 28), brass, [0, 1.5, 0], [0, 0, 0], c);
  mesh(new L.RoundedBoxGeometry(0.2, 0.2, 0.2, 3, 0.05), L.plastic(0x5409DA), [0, 1.8, 0], [0, 0, 0], c);
  mesh(new T.CylinderGeometry(0.06, 0.06, 0.55, 24), brass, [0.38, 1.55, 0], [0, 0, Math.PI / 2], c);
  mesh(new T.CylinderGeometry(0.14, 0.09, 0.3, 28), L.plastic(0x1b1b1f), [0.72, 1.55, 0], [0, 0, Math.PI / 2], c);
  mesh(new T.TorusGeometry(0.09, 0.02, 12, 28), L.plastic(0x5409DA), [0, 1.34, 0], [Math.PI / 2, 0, 0], c);
  // label band
  const lab = mesh(new T.CylinderGeometry(0.385, 0.385, 0.4, 64, 1, true, Math.PI * 0.25 - 0.9, 1.8), mat(0xffffff, { map: H(L).labelTex('#5409DA', '#ffffff', 'WD', 'FOAM CANNON'), roughness: .5 }), [0, 0.6, 0], [0, 0, 0], c); lab.castShadow = false;
  // small soap bottle right-back
  bottle({ h: 0.95, r: 0.25, body: 0x5409DA, text: 'WD', sub: 'SNOW FOAM', label: 0xf7f7f9, pos: [1.5, sh, -0.35], rot: [0, 0.3, 0] });
}
