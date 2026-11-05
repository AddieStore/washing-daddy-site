import { H } from './_a.js';
export default async function (L) {
  const { T, grp, lathe, smooth, cloths, spray } = H(L), { mat, mesh } = L;
  const sh = L.slab(3.6, 2.8, 0.18);
  L.cam.position.set(6.3, 5.9, 6.7); L.cam.lookAt(0, 0.75, 0);
  const leather = mat(0x2d2f36, { roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.45 });
  const acc = mat(0x6b6f7c, { roughness: 0.75, clearcoat: 0.05 });
  const seat = grp([-0.35, sh, -0.1], [0, 0.6, 0]);
  const rb = (w, h, d, r, m, p, rot = [0, 0, 0]) => mesh(new L.RoundedBoxGeometry(w, h, d, 8, r), m, p, rot, seat);
  rb(1.5, 0.2, 1.5, 0.08, L.rubber(), [0, 0.1, 0]);              // frame base
  rb(1.4, 0.34, 1.4, 0.15, leather, [0, 0.36, 0]);               // cushion
  rb(1.0, 0.36, 1.1, 0.14, acc, [0, 0.54, 0.02]);                // centre insert (violet)
  rb(1.46, 0.2, 0.3, 0.1, leather, [0, 0.5, 0.63]);              // front bolster? (toward +z)
  // backrest on -z side tilted
  const bk = grp([0, 0.5, -0.75], [-0.18, 0, 0], seat);
  mesh(new L.RoundedBoxGeometry(1.4, 1.65, 0.34, 8, 0.15), leather, [0, 0.85, 0], [0, 0, 0], bk);
  mesh(new L.RoundedBoxGeometry(0.95, 1.2, 0.3, 8, 0.12), acc, [0, 0.82, 0.07], [0, 0, 0], bk);
  mesh(new L.RoundedBoxGeometry(0.9, 0.42, 0.34, 8, 0.15), leather, [0, 1.85, 0.0], [0, 0, 0], bk); // headrest
  for (const x of [-0.18, 0.18]) mesh(new T.CylinderGeometry(0.03, 0.03, 0.22, 12), L.chrome(), [x, 1.62, 0], [0, 0, 0], bk);
  // stitching lines
  const st = mat(0xffba08, { roughness: 0.6 });
  for (const x of [-0.49, 0.49]) mesh(new T.BoxGeometry(0.012, 0.012, 1.1), st, [x, 0.708, 0.02], [0, 0, 0], seat);
  for (const x of [-0.49, 0.49]) mesh(new T.BoxGeometry(0.012, 1.18, 0.012), st, [x, 0.82, 0.225], [0, 0, 0], bk);
  // microfibre cloths on seat
  cloths([0xf3f0ff, 0x5409DA, 0xFFBA08], { w: 0.8, d: 0.62, t: 0.05, pos: [0, 0.72, 0.12], rotY: 0.2, parent: seat });
  // spray bottle on slab right
  spray({ h: 1.35, r: 0.3, head: 0x5409DA, liquid: 0x7fa6ff, pos: [1.35, sh, 0.55], rot: [0, -2.36, 0] });
  // second small cloth on slab
  cloths([0xffffff, 0x1F4FD8], { w: 0.75, d: 0.6, t: 0.04, pos: [0.55, sh, 1.0], rotY: -0.35 });
}
