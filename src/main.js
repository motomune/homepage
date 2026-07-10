import * as THREE from 'three';
import { createBike } from './bike.js';

// ===== レンダラー =====
const canvas = document.getElementById('bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);
scene.fog = new THREE.Fog(0x0b0e13, 10, 24);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 60);

// ===== ライティング =====
scene.add(new THREE.HemisphereLight(0xe8eefc, 0x14161c, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(4, 7, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -4; key.shadow.camera.right = 4;
key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
scene.add(key);
const rim = new THREE.DirectionalLight(0x7fa8ff, 1.1);
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

const TARGET = new THREE.Vector3(0, 0.8, 0);

// ===== ユーティリティ =====
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (x, a, b) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// ===== カメラの旅路 =====
const CAM_A = new THREE.Vector3(8, 3.2, 16);     // 遠景（ダイブ開始）
const CAM_B = new THREE.Vector3(0.9, 1.05, 3.5); // 至近（回転鑑賞）
const CAM_C = new THREE.Vector3(2.7, 1.6, 4.4);  // 折りたたみ視点
const CAM_D = new THREE.Vector3(-0.2, 1.15, 4.8); // フィナーレ
const camPos = new THREE.Vector3();

// ===== DOM =====
const hero = document.getElementById('hero');
const topbar = document.getElementById('topbar');
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) heroVideo.addEventListener('error', () => heroVideo.remove(), true);

const overlays = [...document.querySelectorAll('.overlay')].map((el) => ({
  el,
  a: parseFloat(el.dataset.in),
  b: parseFloat(el.dataset.out),
  f: parseFloat(el.dataset.f || '0.035'),
}));

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

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);

  // スクロールを滑らかに追従
  p += (pTarget - p) * Math.min(1, dt * 7);

  // --- ヒーロー（吸い込まれる演出：拡大しながらフェード） ---
  const heroFade = ss(p, 0.1, 0.17);
  hero.style.opacity = String(1 - heroFade);
  hero.style.transform = `scale(${1 + ss(p, 0, 0.17) * 1.9})`;
  hero.style.visibility = heroFade >= 1 ? 'hidden' : 'visible';

  // --- 3Dキャンバスのフェードイン ---
  canvas.style.opacity = String(ss(p, 0.12, 0.2));

  // --- トップバー ---
  topbar.style.opacity = String(ss(p, 0.22, 0.27));

  // --- カメラ ---
  if (p <= 0.3) {
    camPos.lerpVectors(CAM_A, CAM_B, ss(p, 0.13, 0.3));
  } else if (p <= 0.62) {
    camPos.copy(CAM_B);
  } else if (p <= 0.84) {
    camPos.lerpVectors(CAM_B, CAM_C, ss(p, 0.62, 0.84));
  } else {
    camPos.lerpVectors(CAM_C, CAM_D, ss(p, 0.84, 0.97));
  }
  camera.position.copy(camPos);
  camera.lookAt(TARGET);

  // --- 自転車の回転 ---
  idleRot += dt * 0.25 * ss(p, 0.88, 0.95); // フィナーレでゆっくり自動回転
  bike.group.rotation.y =
    Math.PI * 2 * 1.15 * ss(p, 0.3, 0.6) + 0.5 * ss(p, 0.62, 0.84) + idleRot;

  // --- 折りたたみ ---
  bike.setFold(ss(p, 0.62, 0.84));

  // --- ホイール回転（ダイブ中は走行感） ---
  const spinSpeed = 14 * ss(p, 0.1, 0.2) * (1 - ss(p, 0.34, 0.5));
  if (spinSpeed > 0.01) bike.spin(dt * spinSpeed);

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
