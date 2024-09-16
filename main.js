import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import * as dat from "dat.gui";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
camera.position.set(0, 0, 1000).setLength(150);
renderer.setPixelRatio(window.devicePixelRatio);

// Post Processing
const renderScene = new RenderPass(scene, camera);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);

// Bloom Pass
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.6,
  0.1,
  0.1
);

composer.addPass(bloomPass);

renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.outputEncoding = THREE.sRGBEncoding;

// Create Text
const fontLoader = new FontLoader();
const textMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: {
      value: 0,
    },
    color1: {
      value: new THREE.Color(0xff5e7f),
    },
    color2: {
      value: new THREE.Color(0x5975ff),
    },
    textPos: {
      value: -10,
    },
  },
  vertexShader: `
  #define PI 3.1415926535897932384626433832795
  uniform float time;
  varying vec3 vC;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform float textPos;

  void main() {
    vec3 pos = position;

    float pLimit = 0.675;
    float nLimit = -pLimit;
    float nullPoint = 0.5;
    float scaledT = time * 1.25;
    float dt = scaledT - pLimit * ( 2. * floor( scaledT / (pLimit* 2.)) + 1.);

    float r = 15. + 1.2 * pow(sin(2. * PI * dt), 4.);
    if (dt < -nullPoint || dt > nullPoint) {
        r = 15.;
    }

    // color
    float gradientFactor = sin( pos.x * 0.01 + pos.y * 0.01); 
    gradientFactor = smoothstep(0.0, 1.2, (gradientFactor + 1.0) / 2.0);

    vC = mix(color1, color2, gradientFactor);

    // Heartbeat
    float scale = r / 15.0;
    pos *= scale;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`,
  fragmentShader: `
  varying vec3 vC;
  void main() {
    gl_FragColor = vec4(vC, 1.0); // Red color
  }
`,
});

fontLoader.load("droid_serif_regular.typeface.json", (font) => {
  const textGeometry = new TextGeometry("I Love Kim Chi", {
    font: font,
    size: 3,
    height: 1,
    curveSegments: 12,
  });
  textGeometry.computeBoundingBox();
  const boundingBox = textGeometry.boundingBox;

  const centerOffsetX = (boundingBox.max.x - boundingBox.min.x) / 2;
  const centerOffsetY = (boundingBox.max.y - boundingBox.min.y) / 2;
  const centerOffsetZ = (boundingBox.max.z - boundingBox.min.z) / 2;

  textGeometry.translate(-centerOffsetX, -centerOffsetY, -centerOffsetZ);
  const text = new THREE.Mesh(textGeometry, textMaterial);

  scene.add(text);
});

// Orbit Controls
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableZoom = false;
orbit.enablePan = false;

// Axes
/* const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);
 */

orbit.update();

const xSize = 50;
const ySize = 50;
const zSize = 50;
const density = 2;
const nParticles = xSize * ySize * zSize * density;
const positions = [];
const speed = [];

for (let i = 0; i < nParticles; i++) {
  positions.push(
    new THREE.Vector3(
      Math.random(),
      Math.random(),
      Math.random()
    ).multiplyScalar(100)
  );
  speed.push(Math.random() * 10 + 2);
}

const pointsGeometry = new THREE.BufferGeometry().setFromPoints(positions);
pointsGeometry.setAttribute(
  "speed",
  new THREE.BufferAttribute(new Float32Array(speed), 1)
);

pointsGeometry.center();
const points = new THREE.Points(
  pointsGeometry,
  new THREE.ShaderMaterial({
    uniforms: {
      time: {
        value: 0,
      },
      size: {
        value: 0.9,
      },
      ratio: {
        value: window.devicePixelRatio,
      },
      scaleEntry: { value: 0.7 },
      step1control: { value: 1 },
      step2control: { value: 1 },
      step3control: { value: 1 },
      step4control: { value: 1 },
      step5control: { value: 1 },
      step6control: { value: 1 },
      color1: { value: new THREE.Color(0xfc466b) }, // Màu bắt đầu gradient
      color2: { value: new THREE.Color(0x3f5efb) }, // Màu kết thúc gradient
    },
    vertexShader: `
      #define PI 3.1415926535897932384626433832795
      varying vec2 vUv;
      uniform float time;
      uniform float scaleEntry;
      uniform float size;
      uniform float ratio;
      attribute float speed;
      varying vec3 vC;
      varying float vDiscard;
      uniform vec3 color1;
      uniform vec3 color2;

      void main() {
        vec3 pos = position;
        vec3 h = pos / 2.5;

        h.y = 4. + 1.2 * h.y - abs(h.x) * sqrt(max((20. - abs(h.x)) / 15., 0.));
        h.z = h.z * ((2. - h.y / 15.));
        float pLimit = 0.675;
        float nLimit = -pLimit;
        float nullPoint = 0.5;
        float scaledT = time * 1.25;
        float dt = scaledT - pLimit * ( 2. * floor( scaledT / (pLimit* 2.)) + 1.);
        float r = 15. + 1.2 * pow(sin(2. * PI * dt), 4.);
        if (dt < -nullPoint || dt > nullPoint) {
            r = 15.;
        }
        float dDyn = length(h) - r;  
        float dConst = length(h) - 15.;      

        float gradientFactor = sin( pos.x * 0.01 + pos.y * 0.01); 
        gradientFactor = smoothstep(0.0, 1.2, (gradientFactor + 1.0) / 2.0);

        vC = mix(color1, color2, gradientFactor);

        pos = pos - pos / length(pos) * (dDyn) * 2.5;

        vec3 vPos = pos;
        vDiscard = dConst > 0. || dConst < -1.0 ? 1. : 0.;

        vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
        gl_PointSize = sqrt(length(pos)/30.) * size * ( 300.0 / -mvPosition.z ) * ratio;
        gl_Position = projectionMatrix * mvPosition;
      }
  `,
    fragmentShader: `

    varying vec3 vC;
    varying float vDiscard;
    varying vec2 vUv;
    void main(){

      if ( vDiscard >= 0.5 ) {discard;}
      if (length(gl_PointCoord - 0.5) > 0.5) {discard;}
      gl_FragColor = vec4( vC, 1.0);
    }
  `,
  })
);
;

scene.add(points);

const clock = new THREE.Clock();
let time = 0;

function animate() {
  if (resize(renderer, composer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  time += clock.getDelta();
  scene.rotation.y = time * 0.25;
  points.material.uniforms.time.value = time;
  textMaterial.uniforms.time.value = time;
  // renderer.render(scene, camera);
  composer.render();
  requestAnimationFrame(animate);
}

animate();

// Resize function
function resize(renderer, composer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
    composer.setSize(width, height); // Update composer size
  }
  return needResize;
}

// Handle window resize
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
