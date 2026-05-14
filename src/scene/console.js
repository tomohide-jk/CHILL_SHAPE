/**
 * REBOOT_GATE — DJ Console (Procedural 3D Model)
 * Interactive turntables, faders, buttons, and waveform monitor
 */
import * as THREE from 'three';

export class DJConsole {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'console';
    this.group.position.set(0, 0, -2.5);

    // Interactive elements (used by Raycaster)
    this.interactables = [];

    // Component references
    this.turntables = [];
    this.faders = [];
    this.buttons = [];
    this.powerButton = null;
    this.dropButton = null;
    this.waveformMonitor = null;
    this.waveformCtx = null;
    this.waveformTexture = null;

    // State
    this.isPoweredOn = false;
    this.faderValues = [0, 0, 0, 0]; // 0-1
    this.turntableSpeed = [0, 0];

    this._buildBody();
    this._buildTurntables();
    this._buildFaders();
    this._buildButtons();
    this._buildWaveformMonitor();
    this._addConsoleNeons();

    this.scene.add(this.group);
  }

  _buildBody() {
    // Main desk
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c0c,
      metalness: 0.8,
      roughness: 0.3,
    });

    // Top surface
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.08, 1.8),
      deskMat
    );
    top.position.set(0, 0.92, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    this.group.add(top);

    // Front panel (angled)
    const frontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.5, 0.06),
      new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        metalness: 0.85,
        roughness: 0.25,
      })
    );
    frontPanel.position.set(0, 0.68, 0.87);
    frontPanel.rotation.x = Math.PI * 0.1;
    this.group.add(frontPanel);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.2,
    });

    const legPositions = [
      [-1.8, 0.44, 0.7],
      [1.8, 0.44, 0.7],
      [-1.8, 0.44, -0.7],
      [1.8, 0.44, -0.7],
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.88, 0.06),
        legMat
      );
      leg.position.set(...pos);
      leg.castShadow = true;
      this.group.add(leg);
    });

    // Edge trim (cyan)
    const trimMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.6,
    });

    const topTrim = new THREE.Mesh(
      new THREE.BoxGeometry(4.02, 0.01, 0.01),
      trimMat
    );
    topTrim.position.set(0, 0.97, 0.9);
    this.group.add(topTrim);
  }

  _buildTurntables() {
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x0e0e0e,
      metalness: 0.7,
      roughness: 0.4,
    });

    const vinylMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      metalness: 0.3,
      roughness: 0.8,
    });

    const labelMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.7,
    });

    [-1.2, 1.2].forEach((xPos, index) => {
      const ttGroup = new THREE.Group();
      ttGroup.position.set(xPos, 0.97, -0.3);

      // Platter base
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.02, 32),
        plateMat
      );
      ttGroup.add(base);

      // Vinyl record
      const vinyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.01, 32),
        vinylMat
      );
      vinyl.position.y = 0.015;
      ttGroup.add(vinyl);

      // Record grooves (rings)
      for (let r = 0.1; r <= 0.38; r += 0.04) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(r, r + 0.005, 32),
          new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.021;
        ttGroup.add(ring);
      }

      // Center label
      const label = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.012, 16),
        labelMat
      );
      label.position.y = 0.02;
      ttGroup.add(label);

      // Spindle
      const spindle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 })
      );
      spindle.position.y = 0.03;
      ttGroup.add(spindle);

      this.group.add(ttGroup);

      const turntable = {
        group: ttGroup,
        vinyl: vinyl,
        speed: 0,
        angle: 0,
        index: index,
      };
      this.turntables.push(turntable);

      // Make the vinyl disc clickable
      vinyl.userData = { type: 'turntable', index };
      this.interactables.push(vinyl);
    });
  }

  _buildFaders() {
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.5,
      roughness: 0.6,
    });

    const knobMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.2,
    });

    const targetColors = [0x00f3ff, 0xff007a, 0x00f3ff, 0xff007a];
    const targetPositions = [0.3, 0.7, 0.5, 0.6]; // correct positions

    for (let i = 0; i < 4; i++) {
      const faderGroup = new THREE.Group();
      faderGroup.position.set(-0.45 + i * 0.3, 0.97, 0.35);

      // Track
      const track = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.005, 0.6),
        trackMat
      );
      faderGroup.add(track);

      // Track markers
      for (let m = 0; m <= 1; m += 0.25) {
        const marker = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.003, 0.005),
          new THREE.MeshBasicMaterial({
            color: 0x2a2a2a,
            transparent: true,
            opacity: 0.5,
          })
        );
        marker.position.z = -0.3 + m * 0.6;
        faderGroup.add(marker);
      }

      // Knob (draggable)
      const knob = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.03, 0.06),
        knobMat.clone()
      );
      knob.position.set(0, 0.015, -0.3 + this.faderValues[i] * 0.6);
      knob.castShadow = true;
      faderGroup.add(knob);

      // LED indicator (shows color when close to target)
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.005, 0.03),
        new THREE.MeshBasicMaterial({
          color: targetColors[i],
          transparent: true,
          opacity: 0.2,
        })
      );
      led.position.set(0, 0.005, 0.35);
      faderGroup.add(led);

      this.group.add(faderGroup);

      const fader = {
        group: faderGroup,
        knob: knob,
        led: led,
        index: i,
        value: 0,
        targetValue: targetPositions[i],
        color: targetColors[i],
        isCorrect: false,
      };
      this.faders.push(fader);

      knob.userData = { type: 'fader', index: i };
      this.interactables.push(knob);
    }
  }

  _buildButtons() {
    const btnPositions = [
      { x: -1.7, z: 0.5, type: 'power', color: 0x00ff44, label: 'PWR' },
      { x: -1.3, z: 0.5, type: 'btn', color: 0x00f3ff, index: 0 },
      { x: -1.1, z: 0.5, type: 'btn', color: 0xff007a, index: 1 },
      { x: 1.1, z: 0.5, type: 'btn', color: 0x00f3ff, index: 2 },
      { x: 1.3, z: 0.5, type: 'btn', color: 0xff007a, index: 3 },
      { x: 1.7, z: 0.5, type: 'drop', color: 0xff3333, label: 'DROP' },
    ];

    btnPositions.forEach((btnDef, i) => {
      const btnGroup = new THREE.Group();
      btnGroup.position.set(btnDef.x, 0.97, btnDef.z);

      // Button base
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.045, 0.01, 16),
        new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          metalness: 0.8,
          roughness: 0.3,
        })
      );
      btnGroup.add(base);

      // Button cap (pressable)
      const capMat = new THREE.MeshStandardMaterial({
        color: btnDef.color,
        metalness: 0.3,
        roughness: 0.5,
        emissive: btnDef.color,
        emissiveIntensity: 0.1,
        transparent: true,
        opacity: 0.8,
      });

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.035, 0.015, 16),
        capMat
      );
      cap.position.y = 0.012;
      btnGroup.add(cap);

      this.group.add(btnGroup);

      const button = {
        group: btnGroup,
        cap: cap,
        type: btnDef.type,
        color: btnDef.color,
        index: btnDef.index,
        isPressed: false,
        isActive: false,
      };

      cap.userData = { type: btnDef.type, index: btnDef.index, buttonRef: button };
      this.interactables.push(cap);

      if (btnDef.type === 'power') {
        this.powerButton = button;
      } else if (btnDef.type === 'drop') {
        this.dropButton = button;
      }
      this.buttons.push(button);
    });
  }

  _buildWaveformMonitor() {
    // Create a canvas for the waveform display
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    this.waveformCtx = canvas.getContext('2d');

    // Fill initial black
    this.waveformCtx.fillStyle = '#050505';
    this.waveformCtx.fillRect(0, 0, 256, 128);

    this.waveformTexture = new THREE.CanvasTexture(canvas);
    this.waveformTexture.minFilter = THREE.LinearFilter;

    // Monitor screen
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.waveformTexture,
    });

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.3),
      screenMat
    );
    screen.position.set(0, 0.98, -0.65);
    screen.rotation.x = -Math.PI * 0.15;
    this.group.add(screen);

    // Monitor frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.2,
    });

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.35, 0.02),
      frameMat
    );
    frame.position.set(0, 0.98, -0.66);
    frame.rotation.x = -Math.PI * 0.15;
    this.group.add(frame);

    this.waveformMonitor = screen;
  }

  _addConsoleNeons() {
    // Edge glow strips on the console
    const neonMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.5,
    });

    // Front edge
    const frontNeon = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.005, 0.005),
      neonMat
    );
    frontNeon.position.set(0, 0.965, 0.9);
    this.group.add(frontNeon);

    // Side edges
    [-2, 2].forEach(x => {
      const sideNeon = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, 0.005, 1.8),
        new THREE.MeshBasicMaterial({
          color: 0xff007a,
          transparent: true,
          opacity: 0.4,
        })
      );
      sideNeon.position.set(x, 0.965, 0);
      this.group.add(sideNeon);
    });
  }

  /**
   * Update waveform monitor display
   */
  updateWaveform(frequencyData) {
    if (!this.waveformCtx || !this.isPoweredOn) return;

    const ctx = this.waveformCtx;
    const w = 256;
    const h = 128;

    // Fade effect
    ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
    ctx.fillRect(0, 0, w, h);

    if (!frequencyData || frequencyData.length === 0) {
      this.waveformTexture.needsUpdate = true;
      return;
    }

    // Draw frequency bars
    const barCount = 64;
    const barWidth = w / barCount;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor(i * frequencyData.length / barCount);
      const value = frequencyData[dataIndex] / 255;
      const barHeight = value * h * 0.8;

      // Color gradient based on frequency
      const hue = 180 + (i / barCount) * 120; // cyan to magenta
      ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.5 + value * 0.5})`;
      ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
    }

    // Center line
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Scanline effect
    const scanY = (Date.now() * 0.05) % h;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(w, scanY);
    ctx.stroke();

    this.waveformTexture.needsUpdate = true;
  }

  /**
   * Update turntable rotation and visual state
   */
  update(time, audioBands) {
    // Rotate turntables
    this.turntables.forEach(tt => {
      tt.angle += tt.speed * 0.02;
      tt.group.rotation.y = tt.angle;
    });

    // Update fader LEDs based on correctness
    this.faders.forEach(fader => {
      const diff = Math.abs(fader.value - fader.targetValue);
      const closeness = 1 - Math.min(diff / 0.5, 1);
      fader.isCorrect = diff < 0.08;

      fader.led.material.opacity = 0.1 + closeness * 0.8;
      if (fader.isCorrect) {
        // Pulse when correct
        fader.led.material.opacity = 0.7 + 0.3 * Math.sin(time * 5);
      }
    });

    // Pulse active buttons
    this.buttons.forEach(btn => {
      if (btn.isActive) {
        const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 4));
        btn.cap.material.emissiveIntensity = pulse;
      }
    });

    // Audio-reactive console glow
    if (audioBands && this.isPoweredOn) {
      const bassGlow = audioBands.low || 0;
      this.turntables.forEach(tt => {
        tt.speed = 1 + bassGlow * 2;
      });
    }
  }

  /**
   * Set fader value (0 to 1)
   */
  setFaderValue(index, value) {
    if (index < 0 || index >= this.faders.length) return;
    const fader = this.faders[index];
    fader.value = Math.max(0, Math.min(1, value));
    // Update knob position
    fader.knob.position.z = -0.3 + fader.value * 0.6;
    this.faderValues[index] = fader.value;
  }

  /**
   * Check if all faders are at correct positions
   */
  areFadersCorrect() {
    return this.faders.every(f => f.isCorrect);
  }

  /**
   * Power on the console
   */
  powerOn() {
    this.isPoweredOn = true;
    this.powerButton.isActive = true;
    this.powerButton.cap.material.emissiveIntensity = 0.8;

    // Animate turntables start spinning
    this.turntables.forEach(tt => {
      tt.speed = 1;
    });
  }

  /**
   * Get all raycaster-targetable meshes
   */
  getInteractables() {
    return this.interactables;
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
    this.scene.remove(this.group);
  }
}
