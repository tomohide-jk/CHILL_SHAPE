/**
 * REBOOT_GATE — Room (Procedural SF Laboratory)
 * Generates a dark laboratory room with neon accents and wiring details
 */
import * as THREE from 'three';

export class Room {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'room';
    this.lights = [];
    this.neonStrips = [];
    this.wires = [];

    this._buildRoom();
    this._addLighting();
    this._addNeonStrips();
    this._addWiringDetails();
    this._addFloorGrid();

    this.scene.add(this.group);
  }

  _buildRoom() {
    const W = 12; // width
    const H = 5;  // height
    const D = 10; // depth

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x080808,
      metalness: 0.85,
      roughness: 0.25,
      side: THREE.BackSide,
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x060606,
      metalness: 0.9,
      roughness: 0.15,
    });

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      wallMat.clone()
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = H;
    this.group.add(ceiling);

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      wallMat.clone()
    );
    backWall.position.set(0, H / 2, -D / 2);
    this.group.add(backWall);

    // Front wall (behind camera, mostly invisible)
    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      wallMat.clone()
    );
    frontWall.position.set(0, H / 2, D / 2);
    frontWall.rotation.y = Math.PI;
    this.group.add(frontWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(D, H),
      wallMat.clone()
    );
    leftWall.position.set(-W / 2, H / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.group.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(D, H),
      wallMat.clone()
    );
    rightWall.position.set(W / 2, H / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.group.add(rightWall);

    // Baseboards (subtle edge detail)
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.3,
    });

    const createBaseboard = (width, pos, rotY = 0) => {
      const geo = new THREE.BoxGeometry(width, 0.08, 0.05);
      const mesh = new THREE.Mesh(geo, baseboardMat);
      mesh.position.copy(pos);
      mesh.rotation.y = rotY;
      this.group.add(mesh);
    };

    createBaseboard(W, new THREE.Vector3(0, 0.04, -D / 2 + 0.025));
    createBaseboard(W, new THREE.Vector3(0, 0.04, D / 2 - 0.025));
    createBaseboard(D, new THREE.Vector3(-W / 2 + 0.025, 0.04, 0), Math.PI / 2);
    createBaseboard(D, new THREE.Vector3(W / 2 - 0.025, 0.04, 0), Math.PI / 2);
  }

  _addLighting() {
    // Ambient (very dim)
    const ambient = new THREE.AmbientLight(0x111122, 0.3);
    this.group.add(ambient);

    // Main spot (from above, focused on console area)
    const mainSpot = new THREE.SpotLight(0x00f3ff, 2, 15, Math.PI / 5, 0.5, 1.5);
    mainSpot.position.set(0, 4.8, -1);
    mainSpot.target.position.set(0, 0.8, -2);
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 1024;
    mainSpot.shadow.mapSize.height = 1024;
    this.group.add(mainSpot);
    this.group.add(mainSpot.target);
    this.lights.push(mainSpot);

    // Accent magenta point light
    const magentaLight = new THREE.PointLight(0xff007a, 1, 10, 2);
    magentaLight.position.set(-4, 3, -3);
    this.group.add(magentaLight);
    this.lights.push(magentaLight);

    // Accent cyan point light (opposite side)
    const cyanLight = new THREE.PointLight(0x00f3ff, 0.8, 10, 2);
    cyanLight.position.set(4, 2, 2);
    this.group.add(cyanLight);
    this.lights.push(cyanLight);

    // Dim back light
    const backLight = new THREE.PointLight(0x001133, 1.5, 12, 2);
    backLight.position.set(0, 4, -4.5);
    this.group.add(backLight);
    this.lights.push(backLight);
  }

  _addNeonStrips() {
    const W = 12, H = 5, D = 10;

    const createNeonStrip = (start, end, color) => {
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
      });

      const dir = new THREE.Vector3().subVectors(end, start);
      const length = dir.length();
      const geo = new THREE.BoxGeometry(length, 0.02, 0.02);
      const mesh = new THREE.Mesh(geo, mat);

      const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mesh.position.copy(midpoint);
      mesh.lookAt(end);

      this.group.add(mesh);
      this.neonStrips.push({ mesh, color, baseOpacity: 0.9 });
    };

    // Ceiling edge neon strips
    const cyanColor = 0x00f3ff;
    const magentaColor = 0xff007a;

    // Back wall top edge
    createNeonStrip(
      new THREE.Vector3(-W / 2, H - 0.05, -D / 2 + 0.05),
      new THREE.Vector3(W / 2, H - 0.05, -D / 2 + 0.05),
      cyanColor
    );

    // Left wall vertical strips
    for (let i = 0; i < 3; i++) {
      createNeonStrip(
        new THREE.Vector3(-W / 2 + 0.05, 0.3 + i * 1.5, -D / 2 + 1 + i * 2.5),
        new THREE.Vector3(-W / 2 + 0.05, 0.3 + i * 1.5 + 1, -D / 2 + 1 + i * 2.5),
        i % 2 === 0 ? cyanColor : magentaColor
      );
    }

    // Right wall vertical strips
    for (let i = 0; i < 3; i++) {
      createNeonStrip(
        new THREE.Vector3(W / 2 - 0.05, 0.3 + i * 1.5, -D / 2 + 2 + i * 2.5),
        new THREE.Vector3(W / 2 - 0.05, 0.3 + i * 1.5 + 1, -D / 2 + 2 + i * 2.5),
        i % 2 === 0 ? magentaColor : cyanColor
      );
    }

    // Floor edge strips
    createNeonStrip(
      new THREE.Vector3(-W / 2 + 0.1, 0.01, -D / 2 + 0.1),
      new THREE.Vector3(-W / 2 + 0.1, 0.01, D / 2 - 0.1),
      cyanColor
    );
    createNeonStrip(
      new THREE.Vector3(W / 2 - 0.1, 0.01, -D / 2 + 0.1),
      new THREE.Vector3(W / 2 - 0.1, 0.01, D / 2 - 0.1),
      magentaColor
    );
  }

  _addWiringDetails() {
    const W = 12, H = 5, D = 10;

    const wireMat = new THREE.LineBasicMaterial({
      color: 0x1a1a1a,
      linewidth: 1,
    });

    const wireMatAccent = new THREE.LineBasicMaterial({
      color: 0x00f3ff,
      linewidth: 1,
      transparent: true,
      opacity: 0.3,
    });

    // Generate random wire paths on back wall
    for (let i = 0; i < 15; i++) {
      const points = [];
      const startX = (Math.random() - 0.5) * W * 0.8;
      const startY = Math.random() * H * 0.8 + 0.5;
      let x = startX;
      let y = startY;
      points.push(new THREE.Vector3(x, y, -D / 2 + 0.02));

      const segments = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < segments; j++) {
        if (j % 2 === 0) {
          x += (Math.random() - 0.5) * 2;
        } else {
          y += (Math.random() - 0.5) * 1.5;
        }
        x = Math.max(-W / 2 + 0.2, Math.min(W / 2 - 0.2, x));
        y = Math.max(0.2, Math.min(H - 0.2, y));
        points.push(new THREE.Vector3(x, y, -D / 2 + 0.02));
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, i % 5 === 0 ? wireMatAccent : wireMat);
      this.group.add(line);
      this.wires.push(line);
    }

    // Side wall conduits
    const conduitMat = new THREE.MeshStandardMaterial({
      color: 0x151515,
      metalness: 0.9,
      roughness: 0.4,
    });

    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 2; i++) {
        const conduit = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, H * 0.7, 0.06),
          conduitMat
        );
        conduit.position.set(
          side * (W / 2 - 0.1),
          H * 0.4,
          -D / 2 + 2 + i * 4
        );
        this.group.add(conduit);
      }
    }
  }

  _addFloorGrid() {
    const gridHelper = new THREE.GridHelper(10, 20, 0x1a1a1a, 0x0f0f0f);
    gridHelper.position.y = 0.005;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.5;
    this.group.add(gridHelper);
  }

  /**
   * Update room effects based on audio data
   * @param {Object} bands - { low, mid, high } from AudioEngine
   * @param {number} time - elapsed time
   */
  update(bands, time) {
    // Pulsate lights with bass
    const bassIntensity = bands.low || 0;
    if (this.lights[0]) { // main spot
      this.lights[0].intensity = 2 + bassIntensity * 5;
    }
    if (this.lights[1]) { // magenta
      this.lights[1].intensity = 1 + bassIntensity * 3;
    }
    if (this.lights[2]) { // cyan
      this.lights[2].intensity = 0.8 + (bands.mid || 0) * 3;
    }

    // Pulse neon strips
    this.neonStrips.forEach((strip, i) => {
      const phase = time * 2 + i * 0.5;
      const pulse = 0.6 + 0.4 * Math.sin(phase) + bassIntensity * 0.5;
      strip.mesh.material.opacity = Math.min(1, strip.baseOpacity * pulse);
    });
  }

  /**
   * Set bloom intensity for escape sequence
   */
  setEscapeMode(intensity) {
    this.lights.forEach(light => {
      light.intensity = light.intensity + intensity * 10;
    });
    this.neonStrips.forEach(strip => {
      strip.mesh.material.opacity = Math.min(1, strip.baseOpacity + intensity);
    });
  }
}
