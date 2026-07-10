import * as THREE from 'three';

const canvas = document.getElementById('bg-canvas');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05050a, 0.06);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 8;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// Ambient particle field
const particleCount = 800;
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 40;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
}
const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleMaterial = new THREE.PointsMaterial({
  color: 0x8a9dff,
  size: 0.05,
  transparent: true,
  opacity: 0.7,
});
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// Floating torus knot as a centerpiece
const knotGeometry = new THREE.TorusKnotGeometry(1.6, 0.45, 180, 24);
const knotMaterial = new THREE.MeshStandardMaterial({
  color: 0x6a7bff,
  metalness: 0.6,
  roughness: 0.25,
  emissive: 0x2a1a6a,
  emissiveIntensity: 0.4,
});
const knot = new THREE.Mesh(knotGeometry, knotMaterial);
scene.add(knot);

const keyLight = new THREE.PointLight(0xb57bff, 8, 20);
keyLight.position.set(4, 3, 5);
scene.add(keyLight);

const fillLight = new THREE.AmbientLight(0x404060, 1.2);
scene.add(fillLight);

let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  const elapsed = clock.getElapsedTime();

  knot.rotation.x = elapsed * 0.25;
  knot.rotation.y = elapsed * 0.35;

  particles.rotation.y = elapsed * 0.02;

  camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.03;
  camera.position.y += (-mouseY * 1.5 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
