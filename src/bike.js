// 折りたたみ自転車 NEO3 の3Dモデル（プロシージャル生成）
// 実車の3Dデータが手に入ったら差し替え可能
import * as THREE from 'three';

const M = {
  frame: new THREE.MeshStandardMaterial({ color: 0xf2f2ef, metalness: 0.55, roughness: 0.3 }),
  black: new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.3, roughness: 0.7 }),
  tire:  new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.95 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.9, roughness: 0.25 }),
  dark:  new THREE.MeshStandardMaterial({ color: 0x2a2c31, metalness: 0.6, roughness: 0.5 }),
};

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const ss = (x, a, b) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// 2点間をつなぐ円柱
function tube(a, b, r, mat = M.frame, seg = 20) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

// 曲線チューブ（メインフレーム用）
function beam(points, r, mat = M.frame) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 14, false), mat);
}

// 20インチ小径ホイール
function wheel() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.052, 18, 48), M.tire));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.024, 12, 48), M.dark));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.add(tube(v(0, 0, i % 2 ? 0.03 : -0.03), v(Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0), 0.006, M.metal, 6));
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 16), M.metal);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.008, 32), M.metal);
  rotor.rotation.x = Math.PI / 2;
  rotor.position.z = 0.06;
  g.add(rotor);
  return g;
}

// フレームの「neo³」ロゴ
function logoPlane() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const cx = cv.getContext('2d');
  cx.clearRect(0, 0, 512, 128);
  cx.font = 'italic 800 92px "Segoe UI", sans-serif';
  cx.fillStyle = '#7c828c';
  cx.textBaseline = 'middle';
  cx.fillText('neo³', 40, 68);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true });
}

export function createBike() {
  const root = new THREE.Group();

  // ===== 後半分（コア） =====
  const core = new THREE.Group();
  root.add(core);

  const rearWheel = wheel();
  rearWheel.position.set(-0.85, 0.5, 0);
  core.add(rearWheel);

  // メインビーム（ヒンジまで）
  core.add(beam([v(-0.5, 0.7), v(-0.1, 0.84), v(0.27, 0.9)], 0.052));

  // ロゴ（両面）
  const logoMat = logoPlane();
  const logoGeo = new THREE.PlaneGeometry(0.42, 0.105);
  const logo1 = new THREE.Mesh(logoGeo, logoMat);
  logo1.position.set(-0.08, 0.815, 0.058);
  logo1.rotation.z = 0.16;
  core.add(logo1);
  const logo2 = logo1.clone();
  logo2.position.z = -0.058;
  logo2.rotation.y = Math.PI;
  logo2.rotation.z = -0.16;
  core.add(logo2);

  // ヒンジブロック
  const hingeBox = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.11), M.metal);
  hingeBox.position.set(0.3, 0.895, 0);
  core.add(hingeBox);

  // チェーンステー / シートステー
  core.add(tube(v(-0.85, 0.5, 0.05), v(0.02, 0.44, 0.05), 0.017));
  core.add(tube(v(-0.85, 0.5, -0.05), v(0.02, 0.44, -0.05), 0.017));
  core.add(tube(v(-0.85, 0.5, 0.045), v(-0.24, 1.06, 0.03), 0.015));
  core.add(tube(v(-0.85, 0.5, -0.045), v(-0.24, 1.06, -0.03), 0.015));

  // シートチューブ
  core.add(tube(v(0.02, 0.42), v(-0.26, 1.1), 0.036));

  // BB・チェーンリング・クランク
  const bb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 16), M.dark);
  bb.rotation.x = Math.PI / 2;
  bb.position.set(0.02, 0.42, 0);
  core.add(bb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 40), M.dark);
  ring.position.set(0.02, 0.42, 0.075);
  core.add(ring);
  core.add(tube(v(0.02, 0.42, 0.09), v(0.17, 0.28, 0.11), 0.015, M.black));
  core.add(tube(v(0.02, 0.42, -0.09), v(-0.13, 0.56, -0.11), 0.015, M.black));
  const pedal1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 0.1), M.black);
  pedal1.position.set(0.17, 0.28, 0.16);
  core.add(pedal1);
  const pedal2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 0.1), M.black);
  pedal2.position.set(-0.13, 0.56, -0.16);
  core.add(pedal2);

  // ===== シートポスト（折りたたみで下がる） =====
  const seat = new THREE.Group();
  const SEAT_BASE = v(-0.26, 1.1, 0);
  seat.position.copy(SEAT_BASE);
  core.add(seat);
  seat.add(tube(v(0, 0, 0), v(-0.11, 0.42), 0.021, M.black));
  const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), M.black);
  saddle.scale.set(1.15, 0.32, 0.55);
  saddle.position.set(-0.14, 0.47, 0);
  seat.add(saddle);

  // ===== 前半分（ヒンジで折れる） =====
  const HINGE = v(0.34, 0.9, 0);
  const front = new THREE.Group();
  front.position.copy(HINGE);
  root.add(front);
  const F = (x, y, z = 0) => v(x - HINGE.x, y - HINGE.y, z);

  front.add(tube(F(0.36, 0.9), F(0.6, 0.94), 0.048));          // ビーム前側
  front.add(tube(F(0.57, 1.06), F(0.67, 0.78), 0.045));        // ヘッドチューブ
  front.add(tube(F(0.66, 0.8, 0.05), F(0.85, 0.5, 0.05), 0.02));   // フォーク
  front.add(tube(F(0.66, 0.8, -0.05), F(0.85, 0.5, -0.05), 0.02));
  front.add(tube(F(0.655, 0.82, -0.06), F(0.655, 0.82, 0.06), 0.03)); // クラウン

  const frontWheel = wheel();
  frontWheel.position.copy(F(0.85, 0.5, 0));
  front.add(frontWheel);

  // ハンドルポスト（折りたたみで倒れる）
  const post = new THREE.Group();
  post.position.copy(F(0.575, 1.05, 0));
  front.add(post);
  post.add(tube(v(0, 0, 0), v(-0.05, 0.55), 0.028, M.black));
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 14), M.black);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(-0.05, 0.56, 0);
  post.add(bar);
  const gripGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.11, 12);
  const grip1 = new THREE.Mesh(gripGeo, M.dark);
  grip1.rotation.x = Math.PI / 2;
  grip1.position.set(-0.05, 0.56, 0.235);
  post.add(grip1);
  const grip2 = grip1.clone();
  grip2.position.z = -0.235;
  post.add(grip2);

  // 影の設定
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // ===== 折りたたみアニメーション f: 0(展開) → 1(折りたたみ) =====
  function setFold(f) {
    // 1. ハンドルが前に倒れる
    post.rotation.z = -2.3 * ss(f, 0, 0.35);
    // 2. 前半分がヒンジでスイングして後輪の横へ
    const swing = ss(f, 0.25, 0.8);
    front.rotation.y = -Math.PI * 0.98 * swing;
    front.position.z = HINGE.z + 0.17 * swing;
    // 3. シートポストが沈む
    const drop = 0.42 * ss(f, 0.6, 1);
    seat.position.set(SEAT_BASE.x + 0.25 * drop, SEAT_BASE.y - 0.97 * drop, 0);
  }

  // ホイール回転（走行感の演出）
  function spin(dz) {
    rearWheel.rotation.z -= dz;
    frontWheel.rotation.z -= dz;
  }

  return { group: root, setFold, spin };
}
