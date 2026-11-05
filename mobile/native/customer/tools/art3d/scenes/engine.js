import { H } from './_a.js';
export default async function (L) {
  const { T, grp, lathe, smooth, bottle } = H(L), { mat, mesh } = L;
  const sh = L.slab(3.6, 2.8, 0.18);
  L.cam.position.set(6.3, 5.9, 6.7); L.cam.lookAt(0.05, 0.6, 0);
  const e = grp([-0.35, sh, -0.1], [0, 0.35, 0]);
  const alu = mat(0x9ea3ab, { metalness: 0.85, roughness: 0.38, clearcoat: 0.1 });
  const darkM = mat(0x2a2d33, { metalness: 0.5, roughness: 0.5, clearcoat: 0.2 });
  const rb = (w, h, d, r, m, p, rot) => mesh(new L.RoundedBoxGeometry(w, h, d, 6, r), m, p, rot || [0, 0, 0], e);
  rb(2.3, 0.25, 1.1, 0.06, darkM, [0, 0.13, 0]);               // base plate
  rb(2.0, 0.55, 0.95, 0.08, alu, [0, 0.52, 0]);                // block
  for (let i = 0; i < 4; i++) rb(0.38, 0.1, 0.99, 0.03, darkM, [-0.75 + i * 0.5, 0.82, 0]);
  rb(2.0, 0.28, 0.85, 0.1, L.plastic(0x1F4FD8), [0, 0.96, 0]);   // head
  // valve cover w/ gold fins
  rb(1.85, 0.2, 0.75, 0.09, L.plastic(0x2b2d33), [0, 1.16, 0]);
  for (let i = 0; i < 9; i++) rb(0.05, 0.05, 0.7, 0.02, L.plastic(0xFFBA08), [-0.8 + i * 0.2, 1.28, 0]);
  // spark plug coils
  for (let i = 0; i < 4; i++) { const x = -0.7 + i * 0.47; mesh(new T.CylinderGeometry(0.075, 0.075, 0.28, 18), L.plastic(0x1b1b1f), [x, 1.42, 0.0], [0, 0, 0], e); mesh(new T.CylinderGeometry(0.095, 0.095, 0.05, 18), L.chrome(), [x, 1.3, 0], [0, 0, 0], e) }
  // oil cap
  mesh(new T.CylinderGeometry(0.17, 0.17, 0.1, 28), L.plastic(0xFFBA08), [0.62, 1.31, 0.17], [0, 0, 0], e);
  mesh(new T.TorusGeometry(0.1, 0.025, 10, 24), L.rubber(), [0.62, 1.37, 0.17], [Math.PI / 2, 0, 0], e);
  // intake manifold pipes (tubes)
  const mk = (pts, r, m) => mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)), false, 'catmullrom', 0.3), 40, r, 16), m, [0, 0, 0], [0, 0, 0], e);
  const pipe = L.chrome();
  for (let i = 0; i < 4; i++) { const x = -0.7 + i * 0.47; mk([[x, 0.98, 0.42], [x, 0.98, 0.7], [x * 0.7, 0.8, 0.92], [x * 0.5, 0.62, 0.92]], 0.055, pipe) }
  mk([[-0.5, 0.62, 0.92], [0.9, 0.62, 0.92]], 0.1, mat(0x1F4FD8, { metalness: 0.4, roughness: 0.3, clearcoat: 1 }));
  mk([[1.0, 0.62, 0.92], [1.2, 0.7, 0.7], [1.15, 0.9, 0.3]], 0.1, L.rubber());
  // hoses (rubber) on rear
  mk([[-0.9, 0.5, -0.5], [-0.9, 1.0, -0.8], [-0.3, 1.0, -0.8], [0.4, 0.6, -0.7]], 0.075, L.rubber());
  // pulley / belt at left end
  mesh(new T.CylinderGeometry(0.34, 0.34, 0.12, 36), alu, [-1.15, 0.5, 0.0], [0, 0, Math.PI / 2], e);
  mesh(new T.CylinderGeometry(0.2, 0.2, 0.16, 28), L.plastic(0x5409DA), [-1.18, 0.5, 0.0], [0, 0, Math.PI / 2], e);
  // brush (long handle, wooden-ish with violet bristles)
  const b = grp([1.1, sh + 0.09, 0.75], [0, -0.55, 0]);
  const rot = [0, 0, Math.PI / 2];
  mesh(new T.CylinderGeometry(0.07, 0.085, 1.4, 20), mat(0xd9b27c, { roughness: 0.6, clearcoat: 0.2 }), [0.45, 0.08, 0], rot, b);
  mesh(new L.RoundedBoxGeometry(0.75, 0.12, 0.3, 4, 0.05), L.plastic(0x5409DA), [-0.5, 0.1, 0], [0, 0, 0], b);
  const bm = L.cloth(0xf2efe6);
  for (let ix = 0; ix < 12; ix++) for (let iz = 0; iz < 5; iz++) mesh(new T.CylinderGeometry(0.02, 0.016, 0.12, 6), bm, [-0.82 + ix * 0.062, 0.0, -0.11 + iz * 0.055], [0, 0, 0], b);
  // degreaser bottle
  bottle({ h: 1.1, r: 0.27, body: 0x1b1b1f, cap: 0xFFBA08, label: 0xFFBA08, text: 'WD', sub: 'DEGREASER', ink: '#1A0A33', pos: [1.35, sh, -0.75], rot: [0, 0.2, 0] });
}
