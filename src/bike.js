// 折りたたみ自転車 NEO3 の3Dモデル（実車写真ベースのプロシージャル生成）
// シャンパンゴールドのフレーム / 黒シートポスト・ハンドルポスト / 小径ホイール
import * as THREE from 'three';

const M = {
  frame: new THREE.MeshStandardMaterial({ color: 0xd6cfc2, metalness: 0.9, roughness: 0.28 }),
  black: new THREE.MeshStandardMaterial({ color: 0x111214, metalness: 0.5, roughness: 0.42 }),
  tire:  new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.95 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xc4c8ce, metalness: 0.95, roughness: 0.2 }),
  dark:  new THREE.MeshStandardMaterial({ color: 0x1c1d21, metalness: 0.7, roughness: 0.45 }),
  cable: new THREE.MeshStandardMaterial({ color: 0x0c0d0f, metalness: 0.2, roughness: 0.6 }),
};

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const ss = (x, a, b) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function tube(a, b, r, mat = M.frame, seg = 20) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

function beam(points, r, mat = M.frame) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 32, r, 16, false), mat);
}

// ケーブル（細い曲線チューブ）
function cable(points) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.007, 8, false), M.cable);
}

// 小径ホイール（14-16インチ風）
function wheel() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 20, 56), M.tire));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 14, 56), M.black));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.add(tube(v(0, 0, i % 2 ? 0.025 : -0.025), v(Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0), 0.005, M.metal, 6));
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.11, 16), M.metal);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  // ディスクローター
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.006, 40), M.metal);
  rotor.rotation.x = Math.PI / 2;
  rotor.position.z = 0.05;
  g.add(rotor);
  const rotor2 = rotor.clone();
  rotor2.position.z = -0.05;
  g.add(rotor2);
  return g;
}

// フレームの「neo」ロゴ
function logoPlane() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const cx = cv.getContext('2d');
  cx.clearRect(0, 0, 512, 128);
  cx.font = 'italic 800 96px "Segoe UI", sans-serif';
  cx.fillStyle = '#4a4d52';
  cx.textBaseline = 'middle';
  cx.fillText('neo', 60, 68);
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
  rearWheel.position.set(-0.68, 0.34, 0);
  core.add(rearWheel);

  // メインビーム（緩いアーチ、ヒンジまで）
  core.add(beam([v(-0.44, 0.5), v(-0.12, 0.6), v(0.12, 0.6)], 0.045));

  // ロゴ（両面）
  const logoMat = logoPlane();
  const logoGeo = new THREE.PlaneGeometry(0.34, 0.085);
  const logo1 = new THREE.Mesh(logoGeo, logoMat);
  logo1.position.set(-0.16, 0.565, 0.05);
  logo1.rotation.z = 0.18;
  core.add(logo1);
  const logo2 = logo1.clone();
  logo2.position.z = -0.05;
  logo2.rotation.y = Math.PI;
  logo2.rotation.z = -0.18;
  core.add(logo2);

  // ヒンジブロック（シルバーのクランプ）
  const hingeBox = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.09), M.metal);
  hingeBox.position.set(0.13, 0.6, 0);
  core.add(hingeBox);

  // チェーンステー / シートステー
  core.add(tube(v(-0.68, 0.34, 0.04), v(0.0, 0.3, 0.04), 0.014));
  core.add(tube(v(-0.68, 0.34, -0.04), v(0.0, 0.3, -0.04), 0.014));
  core.add(tube(v(-0.68, 0.34, 0.035), v(-0.4, 0.66, 0.025), 0.013));
  core.add(tube(v(-0.68, 0.34, -0.035), v(-0.4, 0.66, -0.025), 0.013));

  // シートチューブ（フレーム色）
  core.add(tube(v(-0.3, 0.32), v(-0.42, 0.68), 0.03));

  // BB・チェーンリング・クランク
  const bb = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 16), M.dark);
  bb.rotation.x = Math.PI / 2;
  bb.position.set(0, 0.3, 0);
  core.add(bb);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 8, 44), M.black);
  ring.position.set(0, 0.3, 0.06);
  core.add(ring);
  const ringInner = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.008, 40), M.dark);
  ringInner.rotation.x = Math.PI / 2;
  ringInner.position.set(0, 0.3, 0.06);
  core.add(ringInner);
  core.add(tube(v(0, 0.3, 0.075), v(0.13, 0.17, 0.095), 0.013, M.black));
  core.add(tube(v(0, 0.3, -0.075), v(-0.13, 0.43, -0.095), 0.013, M.black));
  const pedal1 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.016, 0.09), M.black);
  pedal1.position.set(0.13, 0.17, 0.14);
  core.add(pedal1);
  const pedal2 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.016, 0.09), M.black);
  pedal2.position.set(-0.13, 0.43, -0.14);
  core.add(pedal2);

  // リアディレイラー
  const derail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.03), M.dark);
  derail.position.set(-0.68, 0.2, 0.04);
  core.add(derail);

  // リアブレーキケーブル（ヒンジ付近 → 後輪ハブ）
  core.add(cable([v(0.12, 0.64, 0.03), v(-0.2, 0.56, 0.05), v(-0.5, 0.42, 0.05), v(-0.66, 0.36, 0.045)]));

  // ===== シートポスト（黒・長い、折りたたみで沈む） =====
  const seat = new THREE.Group();
  const SEAT_BASE = v(-0.42, 0.68, 0);
  seat.position.copy(SEAT_BASE);
  core.add(seat);
  // ポスト方向：やや後傾で上へ
  seat.add(tube(v(0, 0, 0), v(-0.12, 0.58), 0.019, M.black));
  const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), M.black);
  saddle.scale.set(1.2, 0.3, 0.5);
  saddle.position.set(-0.13, 0.62, 0);
  seat.add(saddle);
  // シートクランプ
  const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 14), M.metal);
  clamp.position.set(-0.01, 0.03, 0);
  seat.add(clamp);

  // ===== 前半分（ヒンジで折れる） =====
  const HINGE = v(0.16, 0.6, 0);
  const front = new THREE.Group();
  front.position.copy(HINGE);
  root.add(front);
  const F = (x, y, z = 0) => v(x - HINGE.x, y - HINGE.y, z);

  front.add(tube(F(0.16, 0.6), F(0.38, 0.64), 0.042));           // ビーム前側
  front.add(tube(F(0.36, 0.74), F(0.46, 0.48), 0.038));          // ヘッドチューブ
  front.add(tube(F(0.45, 0.5, 0.04), F(0.68, 0.34, 0.04), 0.016)); // フォーク
  front.add(tube(F(0.45, 0.5, -0.04), F(0.68, 0.34, -0.04), 0.016));
  front.add(tube(F(0.445, 0.52, -0.05), F(0.445, 0.52, 0.05), 0.026)); // クラウン

  const frontWheel = wheel();
  frontWheel.position.copy(F(0.68, 0.34, 0));
  front.add(frontWheel);

  // ハンドルポスト（黒・長い、折りたたみで倒れる）
  const post = new THREE.Group();
  post.position.copy(F(0.37, 0.76, 0));
  front.add(post);
  post.add(tube(v(0, 0, 0), v(-0.06, 0.68), 0.024, M.black));
  // ポスト中間の折りたたみクランプ
  const pclamp = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 14), M.metal);
  pclamp.position.set(-0.025, 0.3, 0);
  pclamp.rotation.z = 0.09;
  post.add(pclamp);
  // ハンドルバー
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 14), M.black);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(-0.06, 0.69, 0);
  post.add(bar);
  const gripGeo = new THREE.CylinderGeometry(0.023, 0.023, 0.1, 12);
  const grip1 = new THREE.Mesh(gripGeo, M.dark);
  grip1.rotation.x = Math.PI / 2;
  grip1.position.set(-0.06, 0.69, 0.21);
  post.add(grip1);
  const grip2 = grip1.clone();
  grip2.position.z = -0.21;
  post.add(grip2);
  // ブレーキレバー
  const lever1 = tube(v(-0.06, 0.69, 0.16), v(0.04, 0.63, 0.13), 0.008, M.black, 8);
  post.add(lever1);
  const lever2 = tube(v(-0.06, 0.69, -0.16), v(0.04, 0.63, -0.13), 0.008, M.black, 8);
  post.add(lever2);
  // フロントブレーキケーブル（バーから大きく弧を描いて前輪へ）
  post.add(cable([v(0.0, 0.64, 0.1), v(0.42, 0.42, 0.09), v(0.5, 0.0, 0.06), v(0.33, -0.38, 0.045)]));

  // 影の設定
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // ===== 折りたたみ f: 0(展開) → 1(折りたたみ) =====
  function setFold(f) {
    // 1. ハンドルポストが前に倒れる
    post.rotation.z = -2.25 * ss(f, 0, 0.35);
    // 2. 前半分がヒンジでスイング
    const swing = ss(f, 0.25, 0.8);
    front.rotation.y = -Math.PI * 0.96 * swing;
    front.position.z = HINGE.z + 0.15 * swing;
    // 3. シートポストが沈む
    const drop = 0.52 * ss(f, 0.6, 1);
    seat.position.set(SEAT_BASE.x + 0.2 * drop, SEAT_BASE.y - 0.98 * drop, 0);
  }

  function spin(dz) {
    rearWheel.rotation.z -= dz;
    frontWheel.rotation.z -= dz;
  }

  return { group: root, setFold, spin };
}
