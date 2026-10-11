import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

(() => {
  const canvas = document.getElementById("cubeGameCanvas");
  const status = document.getElementById("cubeGameStatus");
  const movesLabel = document.getElementById("cubeMoveCount");
  if (!canvas || !status || !movesLabel) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#08192d");

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(5.8, 5.2, 7.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene.add(new THREE.HemisphereLight(0xe7f4ff, 0x24334a, 2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(5, 8, 7);
  scene.add(keyLight);
  const blueLight = new THREE.PointLight(0x268bff, 30, 18);
  blueLight.position.set(-5, 1, 4);
  scene.add(blueLight);

  const cubeRoot = new THREE.Group();
  scene.add(cubeRoot);
  const puzzle = new THREE.Group();
  cubeRoot.add(puzzle);

  const colors = {
    right: 0xd93636, left: 0xff8a22,
    up: 0xf6f7fb, down: 0xffd629,
    front: 0x16a765, back: 0x2879e8,
    inner: 0x171b23
  };
  const faceMaterials = [
    colors.right, colors.left, colors.up,
    colors.down, colors.front, colors.back
  ].map(color => new THREE.MeshStandardMaterial({
    color, roughness: 0.32, metalness: 0.03
  }));
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: colors.inner, roughness: 0.48, metalness: 0.08
  });

  const cubies = [];
  const spacing = 1.025;
  let moveCount = 0;
  let busy = false;
  const pointers = new Map();
  let oneFingerStart = null;
  let twoFingerStart = null;
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  function createCubies() {
    while (puzzle.children.length) {
      const child = puzzle.children[0];
      puzzle.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
    cubies.length = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const mats = [
            x === 1 ? faceMaterials[0] : darkMaterial,
            x === -1 ? faceMaterials[1] : darkMaterial,
            y === 1 ? faceMaterials[2] : darkMaterial,
            y === -1 ? faceMaterials[3] : darkMaterial,
            z === 1 ? faceMaterials[4] : darkMaterial,
            z === -1 ? faceMaterials[5] : darkMaterial
          ];
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.96), mats);
          mesh.position.set(x * spacing, y * spacing, z * spacing);
          mesh.userData.home = { x, y, z };
          puzzle.add(mesh);
          cubies.push(mesh);
        }
      }
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  function setStatus(text) { status.textContent = text; }
  function updateMoves() { movesLabel.textContent = String(moveCount); }

  function snapCubies(items) {
    const quarter = Math.PI / 2;
    for (const cubie of items) {
      cubie.position.set(
        Math.round(cubie.position.x / spacing) * spacing,
        Math.round(cubie.position.y / spacing) * spacing,
        Math.round(cubie.position.z / spacing) * spacing
      );
      cubie.rotation.set(
        Math.round(cubie.rotation.x / quarter) * quarter,
        Math.round(cubie.rotation.y / quarter) * quarter,
        Math.round(cubie.rotation.z / quarter) * quarter
      );
      cubie.updateMatrix();
    }
  }

  function rotateLayer(face, inverse = false) {
    if (busy) return Promise.resolve();
    const map = {
      R: { axis: "x", value: 1, angle: -Math.PI / 2 },
      L: { axis: "x", value: -1, angle: Math.PI / 2 },
      U: { axis: "y", value: 1, angle: -Math.PI / 2 },
      D: { axis: "y", value: -1, angle: Math.PI / 2 },
      F: { axis: "z", value: 1, angle: -Math.PI / 2 },
      B: { axis: "z", value: -1, angle: Math.PI / 2 }
    };
    const spec = map[face];
    if (!spec) return Promise.resolve();

    busy = true;
    const angle = spec.angle * (inverse ? -1 : 1);
    const selected = cubies.filter(
      cubie => Math.round(cubie.position[spec.axis] / spacing) === spec.value
    );
    const pivot = new THREE.Group();
    puzzle.add(pivot);
    puzzle.updateMatrixWorld(true);
    selected.forEach(cubie => pivot.attach(cubie));

    const start = performance.now();
    const duration = 190;
    return new Promise(resolve => {
      function animateTurn(now) {
        const t = Math.min(1, (now - start) / duration);
        pivot.rotation[spec.axis] = angle * (1 - Math.pow(1 - t, 3));
        if (t < 1) {
          requestAnimationFrame(animateTurn);
        } else {
          pivot.rotation[spec.axis] = angle;
          puzzle.updateMatrixWorld(true);
          selected.forEach(cubie => puzzle.attach(cubie));
          puzzle.remove(pivot);
          snapCubies(selected);
          moveCount++;
          updateMoves();
          busy = false;
          resolve();
        }
      }
      requestAnimationFrame(animateTurn);
    });
  }

  function getFaceAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.intersectObjects(cubies, false)[0];
    if (!hit || !hit.face) return null;

    const worldNormal = hit.face.normal.clone()
      .transformDirection(hit.object.matrixWorld);
    const localNormal = worldNormal.applyQuaternion(cubeRoot.quaternion.clone().invert());
    const abs = [Math.abs(localNormal.x), Math.abs(localNormal.y), Math.abs(localNormal.z)];
    const max = Math.max(...abs);
    let face;
    if (max === abs[0]) face = localNormal.x >= 0 ? "R" : "L";
    else if (max === abs[1]) face = localNormal.y >= 0 ? "U" : "D";
    else face = localNormal.z >= 0 ? "F" : "B";
    return { face, point: { x: clientX, y: clientY } };
  }

  function getTwoPointerCenter() {
    const pts = [...pointers.values()];
    return {
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2
    };
  }

  canvas.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (busy) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}

    if (pointers.size === 1) {
      const hit = getFaceAt(event.clientX, event.clientY);
      oneFingerStart = {
        x: event.clientX, y: event.clientY,
        hit, movedAsView: false
      };
      twoFingerStart = null;
      setStatus("Swipe one finger across a face to turn it");
    } else if (pointers.size >= 2) {
      oneFingerStart = null;
      twoFingerStart = getTwoPointerCenter();
      setStatus("Move two fingers to rotate the whole cube");
    }
  });

  canvas.addEventListener("pointermove", event => {
    if (!pointers.has(event.pointerId) || busy) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const center = getTwoPointerCenter();
      if (twoFingerStart) {
        const dx = center.x - twoFingerStart.x;
        const dy = center.y - twoFingerStart.y;
        cubeRoot.rotation.y += dx * 0.009;
        cubeRoot.rotation.x = Math.max(-1.2, Math.min(1.2, cubeRoot.rotation.x + dy * 0.009));
      }
      twoFingerStart = center;
      return;
    }

    if (pointers.size === 1 && oneFingerStart) {
      const dx = event.clientX - oneFingerStart.x;
      const dy = event.clientY - oneFingerStart.y;
      if (Math.hypot(dx, dy) > 8) oneFingerStart.movedAsView = false;
    }
  });

  async function finishPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    const wasTwoFinger = pointers.size >= 2;
    const start = oneFingerStart;
    const dx = start ? event.clientX - start.x : 0;
    const dy = start ? event.clientY - start.y : 0;
    pointers.delete(event.pointerId);

    if (wasTwoFinger) {
      twoFingerStart = null;
      oneFingerStart = null;
      if (pointers.size === 1) {
        const remaining = [...pointers.values()][0];
        oneFingerStart = {
          x: remaining.x, y: remaining.y,
          hit: getFaceAt(remaining.x, remaining.y),
          movedAsView: false
        };
      }
      return;
    }

    oneFingerStart = null;
    if (!start || !start.hit || Math.hypot(dx, dy) < 22 || busy) {
      setStatus("One finger: swipe a visible cube face to turn it");
      return;
    }

    const dominant = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    // A reverse swipe reverses the turn. Face-side adjustment keeps the gesture intuitive.
    const negativeSide = ["L", "D", "B"].includes(start.hit.face);
    const inverse = (dominant < 0) !== negativeSide;
    setStatus("Turning " + start.hit.face + " face…");
    await rotateLayer(start.hit.face, inverse);
    setStatus("Ready — one finger turns a face, two fingers rotate the cube");
  }

  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", event => {
    pointers.delete(event.pointerId);
    oneFingerStart = null;
    twoFingerStart = null;
  });
  canvas.addEventListener("lostpointercapture", event => {
    pointers.delete(event.pointerId);
  });

  document.getElementById("cubeScramble").addEventListener("click", async () => {
    if (busy) return;
    const faces = ["R", "L", "U", "D", "F", "B"];
    let previous = "";
    setStatus("Scrambling cube…");
    for (let i = 0; i < 20; i++) {
      let face;
      do { face = faces[Math.floor(Math.random() * faces.length)]; } while (face === previous);
      previous = face;
      await rotateLayer(face, Math.random() < 0.5);
    }
    setStatus("Scrambled — swipe a face to solve");
  });

  document.getElementById("cubeReset").addEventListener("click", () => {
    if (busy) return;
    cubeRoot.rotation.set(-0.22, 0.45, 0);
    moveCount = 0;
    updateMoves();
    createCubies();
    setStatus("Cube reset — solved state");
  });

  

  createCubies();
  cubeRoot.rotation.set(-0.22, 0.45, 0);
  setStatus("One finger: turn a face • Two fingers: rotate cube");

  function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }
  render();
})();
