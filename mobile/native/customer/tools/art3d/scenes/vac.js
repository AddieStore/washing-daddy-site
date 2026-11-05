import { H } from './_a.js';
export default async function (L) {
  const { T, grp, lathe } = H(L), { mat, mesh } = L;
  const sh = L.slab(3.6, 2.8, 0.18);
  L.cam.position.set(6.3, 5.9, 6.7); L.cam.lookAt(0, 0.5, 0.1);
  // floor mat with ribs
  const mt = grp([0.05, sh, 0.1], [0, 0.15, 0]);
  mesh(new L.RoundedBoxGeometry(2.7, 0.06, 1.9, 4, 0.025), L.plastic(0x5409DA), [0, 0.03, 0], [0, 0, 0], mt);
  const mm = mat(0x23252b, { roughness: 0.9, clearcoat: 0 });
  mesh(new L.RoundedBoxGeometry(2.5, 0.08, 1.7, 4, 0.03), mm, [0, 0.07, 0], [0, 0, 0], mt);
  for (let i = -11; i <= 11; i++) mesh(new L.RoundedBoxGeometry(0.05, 0.035, 1.58, 2, 0.015), mat(0x34373f, { roughness: 0.9, clearcoat: 0 }), [i * 0.1, 0.125, 0], [0, 0, 0], mt);
  // a bit of dust crumbs
  for (let i = 0; i < 14; i++) mesh(new T.SphereGeometry(0.018 + (i % 3) * 0.006, 8, 6), mat(0x9a8467, { roughness: 1, clearcoat: 0 }), [-0.9 + (i * 0.37) % 1.1, 0.15, 0.2 + ((i * 0.53) % 0.7) - 0.3], [0, 0, 0], mt);
  // vacuum: body along +x
  const v = grp([0.0, sh + 0.6, 0.0], [0, -2.36, 0]); v.scale.setScalar(1.15);
  const body = L.plastic(0x5409DA), white = L.plastic(0xf2f2f6), dark = L.plastic(0x1b1b1f);
  const rot = [0, 0, Math.PI / 2];
  mesh(new T.CylinderGeometry(0.3, 0.3, 0.95, 48), white, [-0.3, 0.3, 0], rot, v).material = body;
  mesh(new T.CylinderGeometry(0.31, 0.31, 0.12, 48), body, [-0.8, 0.3, 0], rot, v);       // rear cap
  mesh(new T.CylinderGeometry(0.24, 0.3, 0.1, 48), body, [-0.84, 0.3, 0], rot, v);
  mesh(new T.CylinderGeometry(0.325, 0.325, 0.07, 48), body, [0.2, 0.3, 0], rot, v);      // collar
  mesh(new T.CylinderGeometry(0.325, 0.325, 0.62, 48, 1, true), new T.MeshPhysicalMaterial({ color: 0xdfe6f5, roughness: 0.05, transmission: 0.55, thickness: 0.4, ior: 1.35, clearcoat: 1, transparent: true, opacity: 0.9, side: T.DoubleSide }), [0.55, 0.3, 0], rot, v);
  for (let i = 0; i < 16; i++) mesh(new T.SphereGeometry(0.04 + (i % 3) * 0.015, 10, 8), mat(0xb0a28a, { roughness: 1, clearcoat: 0 }), [0.4 + (i * 0.07) % 0.35, 0.05 + Math.abs(Math.sin(i * 2)) * 0.05 + 0.04, ((i * 0.37) % 0.4) - 0.2], [0, 0, 0], v);
  mesh(new T.CylinderGeometry(0.2, 0.2, 0.06, 40), body, [0.88, 0.3, 0], rot, v);       // front cap
  mesh(new T.CylinderGeometry(0.1, 0.17, 0.2, 32), dark, [1.0, 0.3, 0], rot, v);        // inlet
  // handle (pistol grip) and battery
  const hh = grp([-0.5, 0.02, 0], [0, 0, -0.2], v); hh.scale.set(1.25, 1.1, 1.3);
  mesh(new L.RoundedBoxGeometry(0.2, 0.72, 0.26, 6, 0.09), dark, [0, 0.0, 0], [0, 0, 0], hh);
  mesh(new L.RoundedBoxGeometry(0.4, 0.2, 0.3, 6, 0.08), body, [0.05, -0.38, 0], [0, 0, 0], hh);
  mesh(new L.RoundedBoxGeometry(0.1, 0.09, 0.16, 4, 0.03), L.plastic(0xFFBA08), [0.14, 0.26, 0], [0, 0, 0], hh); // trigger/switch
  mesh(new L.RoundedBoxGeometry(0.3, 0.08, 0.3, 4, 0.03), L.plastic(0xFFBA08), [-0.1, 0.36, 0], [0, 0, 0], hh);
  // attachments on mat: crevice tool, brush, nozzle
  const cr = grp([-0.75, 0.1 + 0.07, 0.45], [0, 0.5, 0], mt);
  mesh(new T.CylinderGeometry(0.1, 0.12, 0.3, 28), dark, [-0.2, 0.0, 0], rot, cr);
  mesh(new T.ConeGeometry(0.1, 0.8, 28), body, [0.3, 0.0, 0], [0, 0, -Math.PI / 2], cr).scale.set(1, 1, 0.45);
  const br = grp([-0.65, 0.22, -0.45], [0, -0.3, 0], mt);
  mesh(new T.CylinderGeometry(0.11, 0.13, 0.4, 28), dark, [0, 0.0, 0], rot, br);
  mesh(new T.CylinderGeometry(0.2, 0.2, 0.1, 32), white, [0.28, 0.0, 0], rot, br);
  const bm = L.cloth(0x2d2f36);
  for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283; mesh(new T.CylinderGeometry(0.012, 0.012, 0.14, 5), bm, [0.38, Math.sin(a) * 0.18, Math.cos(a) * 0.18], rot, br) }
  // second attachment: round nozzle wide floor tool
  const ft = grp([0.8, 0.14, 0.5], [0, 0.2, 0], mt);
  mesh(new L.RoundedBoxGeometry(0.75, 0.1, 0.26, 4, 0.04), body, [0, 0, 0], [0, 0, 0], ft);
  mesh(new T.CylinderGeometry(0.08, 0.1, 0.36, 24), dark, [-0.3, 0.17, 0], [0, 0, 0.9], ft);
}
