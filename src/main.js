import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createBike } from './bike.js';

// ===== レンダラー =====
const canvas = document.getElementById('bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);
scene.fog = new THREE.Fog(0x0b0e13, 10, 24);

// 映り込み環境（金属の質感向上）
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 60);

// ===== ライティング =====
scene.add(new THREE.HemisphereLight(0xe8eefc, 0x14161c, 0.7));
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(4, 7, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -4; key.shadow.camera.right = 4;
key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
scene.add(key);
const rim = new THREE.DirectionalLight(0x7fa8ff, 1.0);
rim.position.set(-6, 3, -5);
scene.add(rim);

// ===== 自転車と床 =====
const bike = createBike();
scene.add(bike.group);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(10, 48),
  new THREE.MeshStandardMaterial({ color: 0x0e1117, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ===== 浮遊パーティクル（空気感） =====
const P_COUNT = 350;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(P_COUNT * 3);
for (let i = 0; i < P_COUNT; i++) {
  pPos[i * 3] = (Math.random() - 0.5) * 10;
  pPos[i * 3 + 1] = Math.random() * 4;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({
    color: 0x9fc4ff, size: 0.02, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
scene.add(particles);

const TARGET = new THREE.Vector3(0, 0.62, 0);

// ===== ユーティリティ =====
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (x, a, b) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// 山型（0→1→0）
const bump = (x, a, b) => Math.sin(Math.PI * ss(x, a, b));
const lerp = (a, b, t) => a + (b - a) * t;

// ===== カメラの旅路 =====
const CAM_A = new THREE.Vector3(8, 3.0, 15);      // 遠景（ダイブ開始）
const CAM_B = new THREE.Vector3(0.75, 0.85, 2.9); // 至近（回転鑑賞）
const CAM_C = new THREE.Vector3(2.3, 1.35, 3.7);  // 折りたたみ視点
const CAM_D = new THREE.Vector3(-0.15, 0.95, 4.0); // フィナーレ
const camPos = new THREE.Vector3();

// ===== DOM =====
const hero = document.getElementById('hero');
const topbar = document.getElementById('topbar');
const heroTitle = document.getElementById('heroTitle');
const heroMedia = document.getElementById('heroMedia');
const portalRing = document.getElementById('portalRing');
const flash = document.getElementById('flash');
const productStage = document.getElementById('productStage');
const productImg = document.getElementById('productImg');
const heroFades = [...document.querySelectorAll('.hero-fade')];

// hero.mp4 / hero.jpg / product.png が無い場合のフォールバック
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) heroVideo.addEventListener('error', () => heroVideo.remove(), true);
const heroImg = document.querySelector('.hero-img');
if (heroImg) heroImg.addEventListener('error', () => heroImg.remove(), true);
let photoOk = false;
productImg.addEventListener('load', () => { photoOk = true; });
productImg.addEventListener('error', () => { photoOk = false; productStage.style.display = 'none'; });

// 吸い込みの中心（画面に対する割合）
const CENTER = { x: 0.5, y: 0.45 };
heroMedia.style.transformOrigin = `${CENTER.x * 100}% ${CENTER.y * 100}%`;
heroTitle.style.transformOrigin = '50% 50%';

const overlays = [...document.querySelectorAll('.overlay')].map((el) => ({
  el,
  a: parseFloat(el.dataset.in),
  b: parseFloat(el.dataset.out),
  f: parseFloat(el.dataset.f || '0.035'),
}));
// 実写ステージ上に乗る説明テキスト（0.32〜0.61）
const featureOverlays = overlays.filter((o) => o.a >= 0.3 && o.b <= 0.62);

// 実写のズームキーフレーム [進行度, スケール, 原点X%, 原点Y%]
const PHOTO_KEYS = [
  [0.30, 1.0, 50, 50],   // 全体
  [0.40, 1.05, 50, 50],
  [0.47, 2.0, 52, 55],   // ヒンジ（フレーム中央）
  [0.545, 2.0, 52, 55],
  [0.585, 2.2, 72, 72],  // 前輪ディスクブレーキ
  [0.62, 2.2, 72, 72],
];
function photoTransform(p) {
  let k0 = PHOTO_KEYS[0], k1 = PHOTO_KEYS[PHOTO_KEYS.length - 1];
  for (let i = 0; i < PHOTO_KEYS.length - 1; i++) {
    if (p >= PHOTO_KEYS[i][0] && p <= PHOTO_KEYS[i + 1][0]) {
      k0 = PHOTO_KEYS[i]; k1 = PHOTO_KEYS[i + 1];
      break;
    }
  }
  const t = ss(p, k0[0], k1[0]);
  return {
    s: lerp(k0[1], k1[1], t),
    ox: lerp(k0[2], k1[2], t),
    oy: lerp(k0[3], k1[3], t),
  };
}

// ===== スクロール進行度 =====
let pTarget = 0;
let p = 0;
function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  pTarget = max > 0 ? clamp01(scrollY / max) : 0;
}
addEventListener('scroll', readScroll, { passive: true });
readScroll();

// ===== メインループ =====
const clock = new THREE.Clock();
let idleRot = 0;
let elapsed = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  p += (pTarget - p) * Math.min(1, dt * 7);

  // --- ヒーロー：画面中央へ吸い込まれる ---
  const uiFade = ss(p, 0.02, 0.06);
  for (const el of heroFades) el.style.opacity = String(1 - uiFade);

  const zoom = ss(p, 0.05, 0.16);
  // タイトルは軽く拡大しながら消える
  heroTitle.style.transform = `scale(${1 + zoom * 2.6})`;
  heroTitle.style.opacity = String(1 - ss(p, 0.05, 0.11));
  // 映像は中央に向かって突っ込む
  heroMedia.style.transform = `scale(${1 + zoom * 2.4})`;

  // 円形の穴（アイリス）で中央をくぐり抜ける
  const iris = ss(p, 0.1, 0.165);
  hero.style.clipPath = iris > 0
    ? `circle(${(1 - iris) * 120}% at ${CENTER.x * 100}% ${CENTER.y * 100}%)`
    : 'none';
  const heroGone = p > 0.17;
  hero.style.visibility = heroGone ? 'hidden' : 'visible';

  // ポータルリング：穴の縁で光る輪
  const ringVis = bump(p, 0.1, 0.19);
  portalRing.style.opacity = String(ringVis * 0.9);
  portalRing.style.transform = `scale(${(1 - iris) * 2.4 + 0.05})`;

  // 突入フラッシュ
  flash.style.opacity = String(bump(p, 0.15, 0.21) * 0.85);

  // --- 3Dキャンバス表示（実写ステージ表示中は隠す） ---
  const fadeIn = ss(p, 0.13, 0.19);
  const photoCover = photoOk ? ss(p, 0.30, 0.335) * (1 - ss(p, 0.595, 0.63)) : 0;
  canvas.style.opacity = String(fadeIn * (1 - photoCover));

  // --- 実写ステージ ---
  productStage.style.opacity = String(photoCover);
  if (photoCover > 0) {
    const t = photoTransform(p);
    productImg.style.transformOrigin = `${t.ox}% ${t.oy}%`;
    productImg.style.transform = `scale(${t.s})`;
  }
  for (const o of featureOverlays) o.el.classList.toggle('on-light', photoCover > 0.5);

  // --- トップバー ---
  topbar.style.opacity = String(ss(p, 0.22, 0.27));

  // --- カメラ ---
  if (p <= 0.3) {
    camPos.lerpVectors(CAM_A, CAM_B, ss(p, 0.13, 0.3));
  } else if (p <= 0.62) {
    camPos.copy(CAM_B);
    // 鑑賞中はわずかに漂う
    camPos.x += Math.sin(elapsed * 0.5) * 0.06;
    camPos.y += Math.sin(elapsed * 0.7) * 0.04;
  } else if (p <= 0.84) {
    const t = ss(p, 0.62, 0.84);
    camPos.lerpVectors(CAM_B, CAM_C, t);
    // 折りたたみ中は弧を描いて回り込む
    camPos.x += Math.sin(t * Math.PI) * 0.9;
    camPos.y += Math.sin(t * Math.PI) * 0.35;
  } else {
    camPos.lerpVectors(CAM_C, CAM_D, ss(p, 0.84, 0.97));
  }

  // 突入時のスピード感（FOVキック）と着地の揺れ
  camera.fov = 38 + 16 * bump(p, 0.14, 0.3);
  const shake = 0.035 * bump(p, 0.17, 0.24);
  camPos.x += Math.sin(elapsed * 47) * shake;
  camPos.y += Math.cos(elapsed * 39) * shake;
  camera.updateProjectionMatrix();
  camera.position.copy(camPos);
  camera.lookAt(TARGET);

  // --- 自転車の回転 ---
  idleRot += dt * 0.25 * ss(p, 0.88, 0.95);
  bike.group.rotation.y =
    Math.PI * 2 * 1.15 * ss(p, 0.3, 0.6) + 0.5 * ss(p, 0.62, 0.84) + idleRot;

  // --- 折りたたみ ---
  bike.setFold(ss(p, 0.62, 0.84));

  // --- ホイール回転（ダイブ中は走行感） ---
  const spinSpeed = 16 * ss(p, 0.1, 0.2) * (1 - ss(p, 0.34, 0.5));
  if (spinSpeed > 0.01) bike.spin(dt * spinSpeed);

  // --- パーティクルの漂い ---
  particles.rotation.y = elapsed * 0.02;
  particles.position.y = Math.sin(elapsed * 0.3) * 0.1;

  // --- テキストオーバーレイ ---
  for (const o of overlays) {
    const vis = clamp01(Math.min((p - o.a) / o.f, (o.b - p) / o.f));
    o.el.style.opacity = String(vis);
    o.el.style.transform = `translateY(${(1 - vis) * 28}px)`;
    o.el.style.pointerEvents = vis > 0.5 ? 'auto' : 'none';
  }

  renderer.render(scene, camera);
}
frame();

// ===== リサイズ =====
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
