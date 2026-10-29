// Logo Walife 3D v3: i 4 path di WALIFE_LOGO.svg estrusi (nessun redraw), smusso sottile, materiale fisico con grana a 43°.
// Un solo canvas fisso con: logo (4 pezzi ↔ 4 servizi: vista esplosa + pezzo attivo), campo di particelle reattivo al cursore.
import {
  Group, Mesh, MeshPhysicalMaterial, ExtrudeGeometry, FrontSide, Vector3, Color, CanvasTexture, RepeatWrapping,
  OrthographicCamera, Scene, WebGLRenderer, MathUtils, PMREMGenerator, DirectionalLight, PointLight, NoToneMapping, TextureLoader, EquirectangularReflectionMapping, SRGBColorSpace,
  LinearMipmapLinearFilter, BufferGeometry, BufferAttribute, Points, ShaderMaterial, NormalBlending, Vector2,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import svgText from '../assets/walife-logo.svg?raw';

declare global {
  interface Window {
    __wl3d: { explode: number; active: number };
    __wlPieces: { x: number; y: number }[];
  }
}
window.__wl3d = window.__wl3d ?? { explode: 0, active: -1 };
window.__wlPieces = [];

const VB_W = 269.13, VB_H = 414.41; // viewBox del master
const DEPTH = 58; // ≈ larghezza dello stelo (x = 51.58) + un po' di corpo
const BEVEL = 9; // smusso morbido "gonfio"; bevelOffset negativo = la sagoma resta quella del master (richiesto dall'utente, vedi log)
const FRONT = 0x0d9e5b; // Walife Green
const LIGHT = 0xf4f4f4; // reverse: logo bianco sopra le sezioni verdi
const HILITE = 0x1a1a1a; // pezzo attivo: nero (solo 2 colori + nero)

/** Texture procedurale tileable: grana fine + tratteggio a 43° (motivo guida del brand), usata come bump/roughness. */
function surfaceTexture(): CanvasTexture {
  const N = 512;
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
  const img = g.getImageData(0, 0, N, N);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 70;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 2;
  const k = Math.tan((43 * Math.PI) / 180);
  for (let x = -N; x < N * 2; x += 14) { g.beginPath(); g.moveTo(x, N); g.lineTo(x + N / k, 0); g.stroke(); }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1 / 150, 1 / 150); // UV di ExtrudeGeometry sono in unità SVG
  t.anisotropy = 4; t.minFilter = LinearMipmapLinearFilter;
  return t;
}

type Stop = { x: number; y: number; h: number; rx: number; ry: number; react: number; tone: number };
const sm = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const SPIN = 0.0035; // rad per px di scroll: il logo ruota in continuo con lo scroll (~1 giro / 1800 px)

// Regole: 1) hero = al centro tra "Federico" e "Marini"; 2) servizi = colonna sinistra (vista esplosa);
// 3) il resto = dock in basso a destra, mai sopra i titoli; 4) tono chiaro sopra le foto, verde sui fondi scuri.
function stopsFor(vw: number, vh: number): Record<string, Stop> {
  const m = Math.min(Math.max(20, vw * 0.05), 96);
  const mobile = vw < 900;
  const dock = mobile
    ? { x: vw - 36, y: vh - 118, h: 56, rx: 0, ry: 0, react: 0.2, tone: 0 }
    : { x: vw - m - 34, y: vh - 72, h: 76, rx: 0, ry: 0, react: 0.4, tone: 0 };
  return {
    hero: mobile
      ? { x: vw * 0.5, y: vh * 0.42, h: Math.min(vh * 0.36, vw * 0.62), rx: 0.08, ry: -0.35, react: 1, tone: 0 }
      : { x: vw * 0.5, y: vh * 0.5, h: Math.min(vh * 0.66, vw * 0.4), rx: 0.05, ry: -0.3, react: 1, tone: 0 },
    work: dock,
    services: mobile ? dock : { x: vw * 0.27, y: vh * 0.5, h: Math.min(vh * 0.56, vw * 0.3), rx: 0.04, ry: (43 * Math.PI) / 180, react: 0.6, tone: 0 },
    archive: dock,
    contact: dock,
  };
}

const PV = `
  uniform float uTime; uniform vec2 uMouse; uniform vec2 uView; uniform float uScroll; uniform float uPx;
  attribute vec3 aSeed; varying float vA; varying float vW;
  void main() {
    vec3 p = position;
    float s = aSeed.x;
    p.x += sin(uTime * 0.12 + s * 6.283) * 38.0 + sin(uTime * 0.31 + s * 19.0) * 8.0;
    float rise = uTime * (6.0 + aSeed.y * 14.0);
    p.y = mod(p.y + rise - uScroll * (0.15 + aSeed.y * 0.5) + uView.y * 0.5, uView.y) - uView.y * 0.5;
    vec2 d = p.xy - uMouse;
    float len = length(d) + 0.001;
    p.xy += (d / len) * 170.0 * exp(-len / 150.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.6 + aSeed.z * 3.6) * uPx;
    vA = 0.25 + 0.55 * aSeed.y;
    vW = step(0.93, aSeed.x);
  }`;
const PF = `
  varying float vA; varying float vW; uniform float uTone;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r) * vA;
    vec3 col = mix(vec3(0.051, 0.62, 0.357), vec3(0.957), uTone);
    gl_FragColor = vec4(col, a * (0.55 + 0.45 * vW));
  }`;

export async function initLogo(canvas: HTMLCanvasElement): Promise<void> {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NoToneMapping; // il verde del brand non deve virare
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = roomEnv;
  // ambiente = la foto mood del hero (foglia verde luminosa): i riflessi del logo raccontano la scena
  const envUrl = canvas.dataset.envPhoto; // opzionale: disattivato di default (riflessi scuri)
  if (envUrl) {
    try {
      const t = await new TextureLoader().loadAsync(envUrl);
      t.mapping = EquirectangularReflectionMapping; t.colorSpace = SRGBColorSpace;
      scene.environment = pmrem.fromEquirectangular(t).texture;
      t.dispose();
    } catch { /* resta RoomEnvironment */ }
  }
  const key = new DirectionalLight(0xffffff, 1.6); key.position.set(-700, 600, 500); scene.add(key);
  const rim = new PointLight(0x5cffb0, 3.2, 0, 0); rim.position.set(380, -140, 300); scene.add(rim);
  const tex = surfaceTexture();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -2000, 2000);

  // ── logo: 4 mesh, 4 materiali
  const data = new SVGLoader().parse(svgText);
  const inner = new Group();
  const meshes: Mesh[] = [];
  const mats: MeshPhysicalMaterial[] = [];
  for (const path of data.paths) {
    const mat = new MeshPhysicalMaterial({
      color: FRONT, metalness: 0.55, roughness: 0.2, roughnessMap: tex, bumpMap: tex, bumpScale: 0.5,
      clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.35, side: FrontSide,
    });
    const geo = new ExtrudeGeometry(path.toShapes(), { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelOffset: -BEVEL, bevelSegments: 12, curveSegments: 28 });
    const m = new Mesh(geo, mat);
    inner.add(m); meshes.push(m); mats.push(mat);
  }
  if (meshes.length !== 4) throw new Error('logo: attesi 4 path, trovati ' + meshes.length);
  inner.scale.y = -1; // coordinate SVG: y verso il basso
  inner.position.set(-VB_W / 2, VB_H / 2, -DEPTH / 2);
  const pivot = new Group();
  pivot.add(inner);
  scene.add(pivot);

  // direzione di ogni pezzo: radiale dal centro (ingresso + vista esplosa)
  const center = new Vector3(VB_W / 2, VB_H / 2, 0);
  const centroids: Vector3[] = [];
  const dirs = meshes.map((m) => {
    m.geometry.computeBoundingBox();
    const c = m.geometry.boundingBox!.getCenter(new Vector3()); // coordinate locali del path (unità SVG)
    centroids.push(c.clone());
    const d = c.sub(center); d.z = 0;
    if (d.length() < 20) d.set(0, 1, 0);
    return d.normalize();
  });

  // ── particelle (luciole) — niente su mobile low-end oltre 900
  const coarse = matchMedia('(pointer: coarse)').matches; // touch: niente particelle (batteria/prestazioni)
  const narrow = window.innerWidth < 900;
  const COUNT = coarse ? 0 : narrow ? 700 : 1700;
  const pos = new Float32Array(COUNT * 3), seed = new Float32Array(COUNT * 3);
  const FW = 2600, FH = 1800;
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * FW; pos[i * 3 + 1] = (Math.random() - 0.5) * FH; pos[i * 3 + 2] = (Math.random() - 0.5) * 400;
    seed[i * 3] = Math.random(); seed[i * 3 + 1] = Math.random(); seed[i * 3 + 2] = Math.random();
  }
  const pg = new BufferGeometry();
  pg.setAttribute('position', new BufferAttribute(pos, 3));
  pg.setAttribute('aSeed', new BufferAttribute(seed, 3));
  const pu = { uTone: { value: 0 }, uTime: { value: 0 }, uMouse: { value: new Vector2(9999, 9999) }, uView: { value: new Vector2(FW, FH) }, uScroll: { value: 0 }, uPx: { value: 1 } };
  const pm = new ShaderMaterial({ vertexShader: PV, fragmentShader: PF, uniforms: pu, transparent: true, depthWrite: false, blending: NormalBlending });
  const points = new Points(pg, pm);
  points.frustumCulled = false;
  points.position.z = -500;
  if (COUNT > 0) scene.add(points);
  canvas.dataset.particles = String(COUNT);

  let vw = 0, vh = 0;
  let anchors: { key: string; a: number; leave: number }[] = [];
  const measure = () => {
    vw = window.innerWidth; vh = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    pu.uPx.value = dpr;
    renderer.setSize(vw, vh, false);
    camera.left = -vw / 2; camera.right = vw / 2; camera.top = vh / 2; camera.bottom = -vh / 2;
    camera.updateProjectionMatrix();
    // a = arrivo nella posa (inizio sezione); leave = fine "tenuta": nelle sezioni alte/pinned il logo resta fermo
    // finché il fondo della sezione non entra nel viewport, poi viaggia verso la posa successiva.
    anchors = [...document.querySelectorAll<HTMLElement>('[data-logo-stop]')].map((el) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const a = Math.max(0, top + Math.min(el.offsetHeight, vh) / 2 - vh / 2);
      return { key: el.dataset.logoStop!, a, leave: Math.max(a, top + el.offsetHeight - vh) };
    });
    if (anchors[0]) { anchors[0].a = 0; anchors[0].leave = Math.max(0, anchors[0].leave * 0.5); }
  };
  measure();
  window.addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);

  let mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / vw) * 2 - 1;
    my = (e.clientY / vh) * 2 - 1;
    pu.uMouse.value.set(e.clientX - vw / 2, vh / 2 - e.clientY);
  }, { passive: true });

  const cur = { x: 0, y: 0, h: 0, rx: 0, ry: 0, react: 0, tone: 0, explode: 0 };
  const hl = [0, 0, 0, 0]; // evidenziazione per pezzo (0 normale … 1 attivo), -1 spento gestito sotto
  const dim = [0, 0, 0, 0];
  let first = true;
  const cA = new Color(), cB = new Color(FRONT), cL = new Color(LIGHT), cH = new Color(HILITE);
  const t0 = performance.now();
  let last = t0;
  const v3 = new Vector3();

  // inversione cromatica: sopra una sezione verde (.on-green) il logo è bianco, sopra il bianco è verde
  const underGreen = (x: number, y: number) => {
    const e = document.elementFromPoint(Math.min(Math.max(x, 1), vw - 1), Math.min(Math.max(y, 1), vh - 1));
    return !!e?.closest('.on-green');
  };
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const el = (now - t0) / 1000;
    const stops = stopsFor(vw, vh);
    const sy = window.scrollY;
    let i = 0;
    while (i < anchors.length - 1 && sy >= anchors[i + 1].a) i++;
    const A = anchors[i], B = anchors[Math.min(i + 1, anchors.length - 1)];
    const k = B.a > A.leave && sy > A.leave ? sm(MathUtils.clamp((sy - A.leave) / (B.a - A.leave), 0, 1)) : 0;
    const sa = stops[A.key], sb = stops[B.key];
    const tgt = {
      x: lerp(sa.x, sb.x, k), y: lerp(sa.y, sb.y, k), h: lerp(sa.h, sb.h, k), rx: lerp(sa.rx, sb.rx, k),
      ry: lerp(sa.ry, sb.ry, k), react: lerp(sa.react, sb.react, k), tone: underGreen(cur.x, cur.y) ? 1 : 0, explode: window.__wl3d.explode,
    };
    if (first) { Object.assign(cur, tgt); first = false; }
    const f = 1 - Math.exp(-dt * 8);
    for (const key of Object.keys(tgt) as (keyof typeof tgt)[]) cur[key] += (tgt[key] - cur[key]) * f;

    pivot.scale.setScalar(cur.h / VB_H);
    pivot.position.set(cur.x - vw / 2, vh / 2 - cur.y, 0);
    // durante la vista esplosa il logo resta frontale-ish: la rotazione continua dello scroll si attenua
    const spin = sy * SPIN * (1 - cur.explode * 0.85);
    pivot.rotation.y = cur.ry + spin + Math.sin(el * 0.6) * 0.08 + mx * 0.55 * cur.react;
    pivot.rotation.x = cur.rx + Math.sin(el * 0.45) * 0.04 - my * 0.3 * cur.react;

    const active = window.__wl3d.active;
    meshes.forEach((m, n) => {
      // intro: scorrimento lungo l'asse del pezzo (expo-out, sfalsato di 120 ms) + vista esplosa
      const x = MathUtils.clamp((el - 0.15 - n * 0.12) / 1.1, 0, 1);
      const e = x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
      const intro = 460 * (1 - e);
      const ex = cur.explode * 150;
      m.position.set(dirs[n].x * (intro + ex), dirs[n].y * (intro + ex), cur.explode * (n - 1.5) * 34);
      // evidenziazione pezzo attivo / spegnimento degli altri
      hl[n] += ((active === n ? 1 : 0) - hl[n]) * f;
      dim[n] += ((active >= 0 && active !== n ? 1 : 0) - dim[n]) * f;
      cA.copy(cB).lerp(cL, cur.tone).lerp(cH, hl[n]);
      mats[n].color.copy(cA);
      mats[n].metalness = lerp(0.5, 0.15, cur.tone);
      mats[n].envMapIntensity = lerp(1.35, 1.1, cur.tone);
    });

    // posizioni a schermo dei 4 pezzi (callout del DOM)
    pivot.updateMatrixWorld(true);
    meshes.forEach((m, n) => {
      v3.copy(centroids[n]).add(m.position);
      inner.localToWorld(v3);
      window.__wlPieces[n] = { x: v3.x + vw / 2, y: vh / 2 - v3.y };
    });

    pu.uTime.value = el;
    pu.uTone.value = cur.tone;
    pu.uScroll.value = sy;
    renderer.render(scene, camera);
    canvas.dataset.x = cur.x.toFixed(1);
    canvas.dataset.y = cur.y.toFixed(1);
    canvas.dataset.h = cur.h.toFixed(1);
    canvas.dataset.ry = pivot.rotation.y.toFixed(3);
    canvas.dataset.tone = cur.tone.toFixed(2);
    canvas.dataset.explode = cur.explode.toFixed(2);
    canvas.dataset.stop = A.key;
  };
  renderer.setAnimationLoop(frame);
  frame(performance.now());
}
