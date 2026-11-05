# 3D service illustrations (Pronto style) — brief for workers

Goal: replace the photos on the Home "Wash Packs" carousel, the "All car wash services" grid and the service pages with Pronto-style 3D product renders.
Reference look: /tmp/claude-0/pronto-ref/tiles-crop.png (and Pronto screenshots /tmp/claude-0/pronto/*.jpeg, untrusted images). Pronto's renders: photoreal-ish clean 3D, 3/4 high-angle camera, objects arranged on a light terrazzo/stone slab, soft studio light, soft contact shadow, muted realistic materials with a few accent colours, lots of breathing room, object fills ~70% of the tile, nothing cartoonish.
Harness (lead wrote it, don't break the shared API; you may ADD helpers to the L object in harness.html only if all workers keep working — prefer local helpers inside your scene file):
- /tmp/claude-0/art3d/harness.html sets renderer, env light, camera, ground shadow and exposes `L` (THREE, scene, cam, mat, mesh, slab, chrome, rubber, plastic, glass, cloth, foam, car, P palette, RoundedBoxGeometry). Scene file = /tmp/claude-0/art3d/scenes/<id>.js exporting `default async function (L)`. You may move L.cam per scene to frame it.
- Render: `cd /tmp/claude-0/art3d && node render.mjs <id> 720` -> out/<id>.png (transparent, 720x720). Example: scenes/demo.js.
Rules: model real objects from primitives / Lathe / Extrude / Tube geometries with care (bevels, rounded edges, realistic proportions). Use Washing Daddy accents sparingly (violet #5409DA bottle/cloth/label, gold #FFBA08, royal blue #1F4FD8 like our uniforms). Iterate ≥3 renders per scene; Read each PNG and put it next to the Pronto crop to compare quality. A crude result is worse than none: refine until it looks like a product render.

Scenes (id -> content):
- ext: Exterior Pressure Wash — pressure-washer gun with hose coil + yellow/violet bucket, water spray, on slab
- foam: Foam Wash — foam cannon bottle + car door/panel section covered in thick foam
- int: Interior Cleaning — car seat (rounded cushions) with microfibre cloth and spray bottle
- vac: Vacuum Service — handheld cordless car vacuum with nozzle attachments and a floor mat
- engine: Engine Bay Cleaning — stylised engine block (cylinder head, cover, pipes) + brush + degreaser bottle
- tyre: Tyre & Rim Polish — wheel with alloy rim (5 spokes) + tyre gel bottle + applicator pad
- glass: Glass & Windshield — tilted windshield glass pane + squeegee + glass cleaner spray
- dash: Dashboard Polish — dashboard section with steering wheel + polish bottle + cloth
- seat: Seat Shampoo — seat with foam patches + shampoo bottle + brush
- odour: Odour Removal — AC vent section with clip-on air freshener + small diffuser bottle
- ceramic: Ceramic Spray Coat — painted car panel with water beads + ceramic spray bottle + folded cloth
- under: Underbody Wash — car (L.car) lifted on a small ramp/stand with an under-car pressure lance and water
- pack-wash: WD Wash pack — a car (L.car, dark grey) with a bucket and spray gun beside it
- pack-deep: WD Deep Cleaning pack — car with foam on it, vacuum and bottles
- pack-exclusive: WD Exclusive pack — glossy violet car with sparkles, ceramic bottle, gold badge
Assignment: worker A = ext, foam, int, vac, engine; worker B = tyre, glass, dash, seat, odour; worker C = ceramic, under, pack-wash, pack-deep, pack-exclusive (C also polishes L.car if it improves it — tell others by writing NOTES-car.md).
Report: list of PNGs and a contact sheet /tmp/claude-0/art3d/out/sheet-<you>.png. Do not edit the app; the lead wires the images in.
