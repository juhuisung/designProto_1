// LEVIT lamp — scroll-driven 3D object, modelled on stonestyle.co.th.
//
// • The lamp stays fixed in the centre of the viewport and only turns slowly
//   around its vertical axis as you scroll.
// • Layering (see style.css): text < lamp canvas < images.
// • Before the yellow CONTACT footer enters the screen the lamp zooms out and
//   disappears.
// • Scrolling into the footer, the centre texture square becomes a 3D cube that
//   drops in from above, tumbles, rattles and settles where the image was.

import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// binary copy of models/levit_lamp2.stl (same geometry, ~4× smaller download)
const MODEL_URL = `${import.meta.env.BASE_URL}models/levit_lamp2_bin.stl`;
const MODEL_WIDTH = 286; // STL x-extent in mm (-81 … 205)

/* ------------------------------ tuning ------------------------------- */
const LAMP = {
  x: 720, // centre, px from the left of the 1440px .design-frame
  width: 635, // on-screen width in px
  tilt: 0.2, // constant lean toward the camera (rad)
  yawStart: -0.12, // turns at the top of the page (1 = full turn)
  yawPerPx: 1 / 5200, // turns per scrolled px  → ~1 turn over the page
  exitLength: 420, // px of scroll over which the lamp zooms out before the footer
};
// q = 0 when the footer's top edge reaches the bottom of the screen, 1 at the end of the page
const CUBE = {
  startAt: 0.2, // q at which the cube starts falling from the footer's top edge
  settleAt: 0.95, // q at which it has landed
  tumble: [0.5, -0.3, 0.12], // extra turns on x / y / z while falling (kept small for a calm fall)
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------- setup ------------------------------- */
const canvas = document.createElement('canvas');
canvas.className = 'lamp-canvas';
canvas.setAttribute('aria-hidden', 'true');
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const FOV = 24;
const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);

scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d2c4, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(-0.6, 1, 0.9);
scene.add(key);
const rim = new THREE.DirectionalLight(0xfff4e0, 0.9);
rim.position.set(0.8, 0.4, -1);
scene.add(rim);

/* ------------------------------- lamp -------------------------------- */
const mats = {
  yellow: new THREE.MeshPhysicalMaterial({
    color: 0xb8821a,
    roughness: 0.66,
    sheen: 0.3,
    sheenColor: new THREE.Color(0xf2c66a),
    sheenRoughness: 0.8,
    envMapIntensity: 0.55,
  }),
  steel: new THREE.MeshStandardMaterial({ color: 0xc9c7c2, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 }),
  frost: new THREE.MeshPhysicalMaterial({
    color: 0xf3eee6,
    roughness: 0.55,
    transmission: 0.35,
    thickness: 8,
    transparent: true,
    opacity: 0.92,
    emissive: new THREE.Color(0xffd08a),
    emissiveIntensity: 0.12,
  }),
};

// The STL is one merged OpenSCAD mesh, so triangles are assigned a material by
// position (levit_lamp2.stl: mm, Z up, body axis at x=y=0, body radius 46,
// metal rings 46.76, handle out to x=-81, arm starts at x=60).
function classify(cx, cy, cz) {
  const r = Math.hypot(cx, cy);
  if (cx < -46.9 && r > 46.9) return 'steel'; // handle
  if (cx > 46.9 && cx < 60 && cz > 100) return 'steel'; // arm joint
  if (cx > 150 && cz < 10.5) return 'steel'; // foot cap
  if (r <= 47.2) {
    if (cz < 15) return 'frost'; // light diffuser
    if (cz < 18.5) return 'steel'; // lower ring
    if (cz > 151 && cz < 155.5) return 'steel'; // upper ring
  }
  return 'yellow';
}

function splitGeometry(geometry) {
  const pos = geometry.getAttribute('position').array;
  const buckets = { yellow: [], steel: [], frost: [] };
  for (let i = 0; i < pos.length; i += 9) {
    const cx = (pos[i] + pos[i + 3] + pos[i + 6]) / 3;
    const cy = (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3;
    const cz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3;
    const b = buckets[classify(cx, cy, cz)];
    for (let k = 0; k < 9; k++) b.push(pos[i + k]);
  }
  const out = {};
  for (const [name, arr] of Object.entries(buckets)) {
    if (!arr.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    out[name] = toCreasedNormals(g, THREE.MathUtils.degToRad(32));
  }
  return out;
}

// lamp (screen position + scale) → lampSpin (yaw / tilt) → model (Z-up → Y-up, centred)
const lamp = new THREE.Group();
const lampSpin = new THREE.Group();
const model = new THREE.Group();
lamp.add(lampSpin);
lampSpin.add(model);
model.rotation.x = -Math.PI / 2;
lamp.visible = false;
scene.add(lamp);

let lampReady = false;
let lampFade = 0;
new STLLoader().load(MODEL_URL, (geometry) => {
  geometry.computeBoundingBox();
  const c = geometry.boundingBox.getCenter(new THREE.Vector3());
  for (const [name, g] of Object.entries(splitGeometry(geometry))) {
    const mesh = new THREE.Mesh(g, mats[name]);
    mesh.position.set(-c.x, -c.y, -c.z);
    model.add(mesh);
  }
  lampReady = true;
  canvas.classList.add('is-ready');
});

/* ------------------------------- cube -------------------------------- */
const footer = document.querySelector('.frame-footer');
const footerImg = document.querySelector('.footer-texture');
const cube = new THREE.Group();
cube.visible = false;
scene.add(cube);
let cubeReady = false;
// the cube only exists inside the yellow footer: clip everything above its top edge
renderer.localClippingEnabled = true;
const footerClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

// The PNG has a few fully transparent pixels along its edges; map only the opaque part
// onto the cube faces so the edges don't show as dark bands.
function cropTransparentMargin(tex) {
  const img = tex.image;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  const opaque = (x, y) => data[(y * width + x) * 4 + 3] > 200;
  const midX = width >> 1;
  const midY = height >> 1;
  let l = 0;
  let r = width - 1;
  let t = 0;
  let b = height - 1;
  while (l < midX && !opaque(l, midY)) l++;
  while (r > midX && !opaque(r, midY)) r--;
  while (t < midY && !opaque(midX, t)) t++;
  while (b > midY && !opaque(midX, b)) b--;
  // the opaque square inside the PNG is slightly skewed → inset a little more
  const inset = Math.round(width * 0.03);
  l += inset;
  r -= inset;
  t += inset;
  b -= inset;
  // texture v runs bottom → top
  tex.repeat.set((r - l + 1) / width, (b - t + 1) / height);
  tex.offset.set(l / width, (height - 1 - b) / height);
}

if (footerImg) {
  new THREE.TextureLoader().load(footerImg.currentSrc || footerImg.src, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    cropTransparentMargin(tex);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    // same image on every face; side faces slightly darker so the tumble reads as a solid
    const face = (shade) =>
      new THREE.MeshBasicMaterial({
        map: tex,
        color: new THREE.Color(shade, shade, shade),
        toneMapped: false,
        clippingPlanes: [footerClip],
      });
    const front = face(1);
    const mats6 = [face(0.72), face(0.72), face(0.85), face(0.55), front, face(0.6)]; // +x −x +y −y +z −z
    cube.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mats6));
    cubeReady = true;
    document.body.classList.add('has-3d-cube'); // hides the flat <img> (style.css)
  });
}

/* ------------------------------ layout ------------------------------- */
let vw = 0;
let vh = 0;
let maxScroll = 1;
let footerTop = 0;
const frameEl = document.querySelector('.design-frame');

function resize() {
  vw = window.innerWidth;
  vh = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(vw, vh, false);
  camera.aspect = vw / vh;
  // 1 world unit == 1 CSS px on the z = 0 plane
  camera.position.set(0, 0, vh / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  camera.updateProjectionMatrix();
  maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  footerTop = footer ? footer.getBoundingClientRect().top + window.scrollY : maxScroll + vh;
}
window.addEventListener('resize', resize);
resize();

/* ------------------------------ helpers ------------------------------ */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeInCubic = (t) => t * t * t;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
// screen px (from top-left of the viewport) → world position on the z = 0 plane
const toWorld = (x, y, target) => target.set(x - vw / 2, vh / 2 - y, 0);

/* ------------------------------- loop -------------------------------- */
let smooth = window.scrollY;
const clock = new THREE.Clock();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const time = clock.elapsedTime;
  const scrollY = window.scrollY;
  smooth += (scrollY - smooth) * (prefersReducedMotion ? 1 : Math.min(1, dt * 6));

  if (Math.max(1, document.documentElement.scrollHeight - vh) !== maxScroll) resize();

  // --- lamp: fixed centre, slow single-axis turn, zoom-out before the footer
  const footerEnters = footerTop - vh; // scrollY at which the footer's top edge reaches the bottom of the screen
  const exit = clamp01((smooth - (footerEnters - LAMP.exitLength)) / LAMP.exitLength);
  const frameLeft = frameEl ? frameEl.getBoundingClientRect().left : (vw - 1440) / 2;
  if (lampReady) lampFade = Math.min(1, lampFade + dt * 1.5);
  const lampScale = (LAMP.width / MODEL_WIDTH) * (0.94 + 0.06 * lampFade) * (1 - easeInCubic(exit));
  lamp.visible = lampReady && lampScale > 0.001;
  toWorld(frameLeft + LAMP.x, vh / 2, lamp.position);
  lamp.scale.setScalar(Math.max(lampScale, 0.0001));
  lampSpin.rotation.set(LAMP.tilt, (LAMP.yawStart + smooth * LAMP.yawPerPx) * Math.PI * 2, 0);

  // --- cube: drops into the footer as you scroll into it
  if (cubeReady && footerImg) {
    const q = clamp01((smooth - footerEnters) / Math.max(1, maxScroll - footerEnters));
    // fall progress follows the (lightly smoothed) scroll directly → moves at your scroll speed
    const t = clamp01((q - CUBE.startAt) / (CUBE.settleAt - CUBE.startAt));
    const rect = footerImg.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const size = footerImg.offsetWidth;
    const restY = rect.top + rect.height / 2;
    // starts fully above the footer edge (hidden by the clip); nearly linear with scroll,
    // softening only at the very end so it lands without a bounce
    const fall = easeOutQuad(t);
    const lift = (1 - fall) * (restY - footerRect.top + size);
    toWorld(rect.left + rect.width / 2, restY - lift, cube.position);
    cube.position.z = -size / 2; // front face on the z = 0 plane → same size as the <img>
    cube.scale.setScalar(size);
    footerClip.constant = vh / 2 - footerRect.top;

    const spin = 1 - easeOutCubic(t); // slow tumble that unwinds as it lands
    const idle = prefersReducedMotion || t < 1 ? 0 : 1;
    cube.rotation.set(
      spin * CUBE.tumble[0] * Math.PI * 2 + Math.sin(time * 0.6) * 0.03 * idle,
      spin * CUBE.tumble[1] * Math.PI * 2 + Math.sin(time * 0.45) * 0.04 * idle,
      spin * CUBE.tumble[2] * Math.PI * 2 - THREE.MathUtils.degToRad(5), // CSS rotate(5deg)
    );
    cube.visible = t > 0;
  }

  // fade the canvas in once the lamp has loaded (the cube only shows later, at the footer)
  canvas.style.opacity = String(lampReady ? lampFade : 1);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
