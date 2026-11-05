// Worker A helpers
export function H(L) {
  const T = L.THREE, { mat, mesh } = L;
  const V = (x, y) => new T.Vector2(x, y);
  const lathe = (pts, m, pos, rot, parent, seg = 48) => mesh(new T.LatheGeometry(pts.map(p => V(p[0], p[1])), seg), m, pos, rot, parent);
  const smooth = (pts, n = 6) => { const c = new T.SplineCurve(pts.map(p => V(p[0], p[1]))); return c.getPoints(pts.length * n).map(p => [Math.max(p.x, 0), p.y]) };
  const grp = (pos = [0, 0, 0], rot = [0, 0, 0], parent = L.scene) => { const g = new T.Group(); g.position.set(...pos); g.rotation.set(...rot); parent.add(g); return g };
  const labelTex = (bg, fg, text, sub) => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 512, 256); g.fillStyle = fg; g.font = '700 64px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillText(text, 256, 130); if (sub) { g.font = '500 30px Helvetica, Arial, sans-serif'; g.globalAlpha = .75; g.fillText(sub, 256, 185) } const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t };
  // Bottle: body (rounded shoulder), neck, cap, wrapped label. Origin at base.
  function bottle({ h = 1.2, r = 0.32, body = 0x5409DA, cap = 0xf7f7f9, label = 0xf7f7f9, text = 'WD', sub = 'CLEANER', ink = '#5409DA', trans = false, pos, rot, parent }) {
    const g = grp(pos, rot, parent);
    const bm = trans ? new T.MeshPhysicalMaterial({ color: body, roughness: 0.08, transmission: 0.55, thickness: 0.5, ior: 1.4, clearcoat: 1 }) : L.plastic(body);
    const pts = smooth([[0, 0], [r * 0.9, 0.0], [r, 0.07], [r, h * 0.62], [r * 0.9, h * 0.76], [r * 0.45, h * 0.86], [r * 0.34, h * 0.9]], 5);
    lathe(pts, bm, [0, 0, 0], [0, 0, 0], g);
    const lh = h * 0.42, lt = labelTex('#' + label.toString(16).padStart(6, '0'), ink, text, sub);
    const lab = mesh(new T.CylinderGeometry(r * 1.03, r * 1.03, lh, 64, 1, true, Math.PI * 0.25 - Math.PI * 0.55, Math.PI * 1.1), mat(0xffffff, { map: lt, roughness: 0.5, clearcoat: 0.2 }), [0, h * 0.34, 0], [0, 0, 0], g); lab.castShadow = false;
    lathe([[0, 0], [r * 0.36, 0], [r * 0.38, 0.03], [r * 0.38, h * 0.16], [r * 0.34, h * 0.18], [0, h * 0.18]], L.plastic(cap), [0, h * 0.88, 0], [0, 0, 0], g, 40);
    return g;
  }
  // Trigger spray bottle. Origin at base.
  function spray({ h = 1.3, r = 0.3, body = 0xdfefff, head = 0x5409DA, liquid = 0xaee0ff, pos, rot, parent }) {
    const g = grp(pos, rot, parent);
    const glassM = new T.MeshPhysicalMaterial({ color: liquid, roughness: 0.12, transmission: 0.12, thickness: 0.5, ior: 1.4, clearcoat: 1 });
    lathe(smooth([[0, 0], [r * 0.92, 0], [r, 0.08], [r, h * 0.55], [r * 0.85, h * 0.7], [r * 0.4, h * 0.78], [r * 0.34, h * 0.8]], 5), glassM, [0, 0, 0], [0, 0, 0], g);
    const hm = L.plastic(head);
    lathe([[0, 0], [r * 0.4, 0], [r * 0.4, h * 0.1], [r * 0.34, h * 0.1], [0, h * 0.1]], hm, [0, h * 0.78, 0], [0, 0, 0], g, 32);
    // pump head
    mesh(new L.RoundedBoxGeometry(r * 1.9, r * 0.75, r * 0.7, 4, 0.1), hm, [r * 0.45, h * 0.9, 0], [0, 0, 0], g);
    mesh(new T.CylinderGeometry(r * 0.2, r * 0.26, r * 0.7, 20), hm, [r * 1.35, h * 0.9, 0], [0, 0, Math.PI / 2], g);
    // trigger
    const tr = mesh(new L.RoundedBoxGeometry(r * 0.2, r * 0.9, r * 0.38, 3, 0.05), hm, [r * 0.62, h * 0.76, 0], [0, 0, -0.35], g);
    // dip tube
    mesh(new T.CylinderGeometry(0.02, 0.02, h * 0.75, 8), mat(0xffffff, { roughness: .3 }), [0, h * 0.4, 0], [0, 0, 0], g);
    return g;
  }
  // Tapered bucket with handle. Origin at base.
  function bucket({ h = 1.0, rb = 0.5, rt = 0.62, color = 0xFFBA08, rim = 0x5409DA, pos, rot, parent, filled = false }) {
    const g = grp(pos, rot, parent), m = L.plastic(color);
    const t = 0.035;
    lathe([[0, 0], [rb, 0], [rb + 0.02, 0.05], [rt, h], [rt + 0.05, h + 0.02], [rt + 0.05, h + 0.06], [rt - t, h + 0.04], [rt - t - 0.01, h - 0.02], [rb - t, 0.08], [0, 0.08]], m, [0, 0, 0], [0, 0, 0], g, 64);
    lathe([[rt - 0.005, h * 0.88], [rt + 0.02, h * 0.88], [rt + 0.02, h * 0.95], [rt, h * 0.95]], L.plastic(rim), [0, 0, 0], [0, 0, 0], g, 64);
    // handle
    const hc = new T.CatmullRomCurve3([new T.Vector3(-rt, h * 0.95, 0), new T.Vector3(-rt * 0.9, h * 1.5, 0), new T.Vector3(0, h * 1.75, 0), new T.Vector3(rt * 0.9, h * 1.5, 0), new T.Vector3(rt, h * 0.95, 0)]);
    mesh(new T.TubeGeometry(hc, 40, 0.02, 8), L.chrome(), [0, 0, 0], [0, 0, 0], g);
    if (filled) lathe([[0, 0], [rt - 0.06, 0]], mat(0x9fd7ff, { roughness: .05, transmission: .6 }), [0, h * 0.8, 0], [0, 0, 0], g);
    return g;
  }
  // Folded cloth stack (rounded boxes, slightly rotated)
  function cloths(colors, { w = 1.0, d = 0.8, t = 0.045, pos = [0, 0, 0], rotY = 0, parent } = {}) {
    const g = grp(pos, [0, rotY, 0], parent);
    colors.forEach((c, i) => mesh(new L.RoundedBoxGeometry(w, t, d, 3, 0.02), L.cloth(c), [0.02 * Math.sin(i * 2), t / 2 + i * t * 0.98, 0.015 * Math.cos(i * 3)], [0, (i % 2 ? 1 : -1) * 0.05 * (i + 1), 0], g));
    return g;
  }
  // Foam: clustered spheres w/ soft off-white
  function foamBlob(at, { r = 0.5, n = 40, s = 0.1, flat = 0.7, parent } = {}) {
    const m = mat(0xffffff, { roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.6, sheen: 0.4, sheenColor: new T.Color(0xdde8ff) });
    const g = grp(at, [0, 0, 0], parent);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r, rr = s * (0.5 + rnd() * 0.9); const hh = (1 - d / r) * r * flat; mesh(new T.SphereGeometry(rr, 18, 14), m, [Math.cos(a) * d, hh * rnd() + rr * 0.5, Math.sin(a) * d], [0, 0, 0], g) }
    return g;
  }
  // helix tube hose
  function hose({ pos, turns = 3, R = 0.55, tube = 0.07, rise = 0.12, color = 0x2b2f36, tail = [], parent }) {
    const pts = []; const N = turns * 40;
    for (let i = 0; i <= N; i++) { const a = i / 40 * 6.283; pts.push(new T.Vector3(Math.cos(a) * R, 0.07 + (i / 40) * rise + Math.sin(a * 0.5) * 0.0, Math.sin(a) * R)) }
    for (const p of tail) pts.push(new T.Vector3(...p));
    const c = new T.CatmullRomCurve3(pts);
    return mesh(new T.TubeGeometry(c, pts.length * 4, tube, 16), L.mat(color, { roughness: 0.55, clearcoat: 0.3 }), pos, [0, 0, 0], parent);
  }
  return { T, lathe, smooth, grp, bottle, spray, bucket, cloths, foamBlob, hose, labelTex };
}
