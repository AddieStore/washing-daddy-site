import { H } from './_a.js';
export default async function (L) {
  const { T, grp, lathe, bucket, hose, spray, bottle } = H(L), { mat, mesh } = L;
  const sh = L.slab(3.6, 2.8, 0.18);
  L.cam.position.set(6.3, 5.9, 6.7); L.cam.lookAt(-0.35, 0.6, 0.15);
  // bucket (yellow w/ violet band) left-back
  bucket({ h: 0.95, rb: 0.46, rt: 0.58, pos: [-1.0, sh, -0.3], filled: true });
  // hose coil in front
  hose({ pos: [0.5, sh, 0.35], turns: 3, R: 0.62, tube: 0.075, rise: 0.17, color: 0x2a6bd8, tail: [[0.3, 0.62, 0.0], [0.0, 0.75, 0.05], [-0.2, 0.55, 0.0]] });
  // gun: group
  const g = grp([0.5, sh + 0.98, 0.35], [0, 0, 0]); g.rotation.order = 'YZX'; g.rotation.set(0, Math.PI + 0.5, -0.22); g.scale.setScalar(1.2);
  const body = L.plastic(0x1F4FD8), dark = L.rubber(), grip = L.plastic(0x1b1b1f), yel = L.plastic(0xFFBA08);
  mesh(new L.RoundedBoxGeometry(0.75, 0.28, 0.24, 5, 0.1), body, [0, 0.2, 0], [0, 0, 0], g);
  mesh(new L.RoundedBoxGeometry(0.22, 0.6, 0.22, 5, 0.09), grip, [-0.2, -0.12, 0], [0, 0, 0.18], g);
  mesh(new T.CylinderGeometry(0.085, 0.085, 0.2, 20), dark, [-0.3, -0.5, 0], [0, 0, 0.18], g);
  mesh(new L.RoundedBoxGeometry(0.1, 0.34, 0.12, 3, 0.04), grip, [0.05, -0.02, 0], [0, 0, -0.35], g);
  mesh(new T.CylinderGeometry(0.06, 0.06, 0.9, 24), L.chrome(), [0.7, 0.24, 0], [0, 0, Math.PI / 2], g);
  mesh(new T.CylinderGeometry(0.1, 0.1, 0.22, 24), yel, [0.38, 0.24, 0], [0, 0, Math.PI / 2], g);
  mesh(new T.CylinderGeometry(0.08, 0.1, 0.16, 24), yel, [1.17, 0.24, 0], [0, 0, Math.PI / 2], g);
  mesh(new T.CylinderGeometry(0.045, 0.045, 0.08, 16), dark, [1.27, 0.24, 0], [0, 0, Math.PI / 2], g);
  mesh(new T.TorusGeometry(0.13, 0.025, 12, 28, 4.2), dark, [0.1, -0.08, 0], [0, 0, 0.7], g);
  // water spray: fan of thin translucent cone + droplets
  const wm = new T.MeshPhysicalMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.3, roughness: 0.1, transmission: 0.6, thickness: 0.2, depthWrite: false });
  const cone = mesh(new T.ConeGeometry(0.4, 1.1, 40, 1, true), wm, [1.85, 0.24, 0], [0, 0, Math.PI / 2], g); cone.castShadow = false;
  let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const dm = new T.MeshPhysicalMaterial({ color: 0xe8f5ff, transparent: true, opacity: 0.7, roughness: 0.02, transmission: 0.8, thickness: 0.1 });
  for (let i = 0; i < 34; i++) { const t = 0.2 + rnd() * 0.8, a = rnd() * 6.283, rr = t * 0.4 * rnd(); const d = mesh(new T.SphereGeometry(0.018 + rnd() * 0.03, 10, 8), dm, [1.35 + t * 1.0, 0.24 + Math.cos(a) * rr, Math.sin(a) * rr], [0, 0, 0], g); d.castShadow = false }
  // detergent bottle right-back
  bottle({ h: 1.1, r: 0.28, body: 0x1F4FD8, text: 'WD', sub: 'PRO WASH', pos: [1.3, sh, -0.6] });
  // splash puddle on slab
  const pud = mesh(new T.CircleGeometry(0.5, 40), new T.MeshPhysicalMaterial({ color: 0xbfe0f5, transparent: true, opacity: 0.45, roughness: 0.03, clearcoat: 1 }), [-1.0, sh + 0.004, 1.0], [-Math.PI / 2, 0, 0]); pud.castShadow = false; pud.scale.set(1.5, 1, 0.8);
}
