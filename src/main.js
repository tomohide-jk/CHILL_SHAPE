/**
 * REBOOT_GATE — Main Entry Point
 * Three.js scene, game loop, raycaster interaction, post-processing
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { Room } from './scene/room.js';
import { DJConsole } from './scene/console.js';
import { AudioEngine } from './logic/audio.js';
import { PuzzleManager } from './logic/puzzle.js';
import { Overlay } from './ui/overlay.js';

// ──────────────────────────────
// Game State
// ──────────────────────────────
const GameState = {
  INIT: 'INIT',
  PLAYING: 'PLAYING',
  SOLVED: 'SOLVED',
  ESCAPED: 'ESCAPED',
};

let state = GameState.INIT;
let clock, scene, camera, renderer, composer, bloomPass;
let room, djConsole, audioEngine, puzzle, overlay;
let raycaster, mouse, hoveredObject;
let isDragging = false;
let dragFaderIndex = -1;
let dragStartY = 0;
let dragStartValue = 0;
let escapeStartTime = 0;

// ──────────────────────────────
// Initialize
// ──────────────────────────────
function init() {
  clock = new THREE.Clock();

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.FogExp2(0x050505, 0.06);

  // Camera
  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 2.2, 2.5);
  camera.lookAt(0, 1, -2.5);

  // Renderer
  const container = document.getElementById('canvas-container');
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Post-processing
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8,  // strength
    0.3,  // radius
    0.85  // threshold
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // Raycaster
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2(-999, -999);

  // Build scene objects
  room = new Room(scene);
  djConsole = new DJConsole(scene);

  // Audio
  audioEngine = new AudioEngine();

  // Puzzle
  puzzle = new PuzzleManager();
  puzzle.onStageChange = (stage) => {
    overlay.setStage(stage);
    overlay.showStageClear();
    audioEngine.playCorrectSE();
  };
  puzzle.onHint = (text) => {
    overlay.showHint(text);
  };
  puzzle.onCorrect = (type) => {
    if (type === 'stage') {
      audioEngine.playCorrectSE();
    }
  };
  puzzle.onError = () => {
    audioEngine.playErrorSE();
  };
  puzzle.onComplete = () => {
    startEscapeSequence();
  };

  // UI Overlay
  overlay = new Overlay();
  overlay.onStart = async () => {
    await audioEngine.init();
    state = GameState.PLAYING;
    puzzle.start();
  };

  // Events
  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });

  // Prevent pinch zoom on mobile
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('gesturechange', e => e.preventDefault());

  // Start render loop
  animate();
}

// ──────────────────────────────
// Resize
// ──────────────────────────────
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);
}

// ──────────────────────────────
// Pointer / Mouse Events
// ──────────────────────────────
function onPointerMove(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Fader dragging
  if (isDragging && dragFaderIndex >= 0) {
    const deltaY = (event.clientY - dragStartY) / window.innerHeight;
    const newValue = Math.max(0, Math.min(1, dragStartValue - deltaY * 3));
    djConsole.setFaderValue(dragFaderIndex, newValue);
    audioEngine.playFaderSE(newValue);
    puzzle.handleInteraction('fader', dragFaderIndex, djConsole, audioEngine);
  }
}

function onPointerDown(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (state !== GameState.PLAYING) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(djConsole.getInteractables(), false);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const userData = hit.userData;

    if (userData.type === 'fader') {
      // Start fader drag
      isDragging = true;
      dragFaderIndex = userData.index;
      dragStartY = event.clientY;
      dragStartValue = djConsole.faderValues[userData.index];
      renderer.domElement.style.cursor = 'ns-resize';
    } else {
      // Buttons and turntables
      puzzle.handleInteraction(userData.type, userData.index, djConsole, audioEngine);

      // Visual press feedback
      if (userData.buttonRef) {
        const btn = userData.buttonRef;
        btn.cap.position.y = 0.006;
        setTimeout(() => { btn.cap.position.y = 0.012; }, 150);
      }
    }
  }
}

function onPointerUp(event) {
  if (isDragging) {
    isDragging = false;
    dragFaderIndex = -1;
    renderer.domElement.style.cursor = 'crosshair';
  }
}

function onTouchStart(event) {
  // Prevent default to block pinch zoom
  if (event.touches.length > 1) {
    event.preventDefault();
  }
}

// ──────────────────────────────
// Escape Sequence
// ──────────────────────────────
function startEscapeSequence() {
  state = GameState.SOLVED;
  escapeStartTime = clock.getElapsedTime();

  // Start the drop music
  audioEngine.stopAmbient();
  audioEngine.startDrop();

  // Trigger overlay escape animation
  overlay.startEscapeSequence();

  // After 3 seconds, transition to escaped
  setTimeout(() => {
    state = GameState.ESCAPED;
  }, 4000);
}

// ──────────────────────────────
// Hover Highlight
// ──────────────────────────────
function updateHover() {
  if (state !== GameState.PLAYING || isDragging) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(djConsole.getInteractables(), false);

  // Reset previous hover
  if (hoveredObject) {
    if (hoveredObject.material && hoveredObject.material.emissiveIntensity !== undefined) {
      hoveredObject.material.emissiveIntensity = hoveredObject.userData._originalEmissive || 0.1;
    }
    hoveredObject = null;
  }

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    hoveredObject = hit;
    renderer.domElement.style.cursor = 'pointer';

    // Highlight
    if (hit.material && hit.material.emissiveIntensity !== undefined) {
      hit.userData._originalEmissive = hit.userData._originalEmissive || hit.material.emissiveIntensity;
      hit.material.emissiveIntensity = 0.6;
    }
  } else {
    renderer.domElement.style.cursor = 'crosshair';
  }
}

// ──────────────────────────────
// Animation Loop
// ──────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Update audio analysis
  const bands = audioEngine.update();

  // Update scene objects
  room.update(bands, elapsed);
  djConsole.update(elapsed, bands);
  djConsole.updateWaveform(audioEngine.getFrequencyData());

  // Update puzzle logic
  if (state === GameState.PLAYING) {
    puzzle.update(dt, djConsole, audioEngine);
    updateHover();
  }

  // Update UI visualizer
  overlay.updateVisualizer(audioEngine.getFrequencyData());

  // Escape sequence bloom ramp
  if (state === GameState.SOLVED) {
    const escapeElapsed = elapsed - escapeStartTime;
    const bloomRamp = Math.min(escapeElapsed / 3, 1);
    bloomPass.strength = 0.8 + bloomRamp * 15;
    bloomPass.radius = 0.3 + bloomRamp * 2;
    renderer.toneMappingExposure = 1 + bloomRamp * 5;
  }

  // Gentle camera sway
  if (state === GameState.PLAYING || state === GameState.INIT) {
    camera.position.x = Math.sin(elapsed * 0.15) * 0.05;
    camera.position.y = 2.2 + Math.sin(elapsed * 0.2) * 0.02;
  }

  // Render
  composer.render();
}

// ──────────────────────────────
// Boot
// ──────────────────────────────
init();
