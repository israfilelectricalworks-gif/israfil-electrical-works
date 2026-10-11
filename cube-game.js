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

  document.getElementById("cubeShuffleView").addEventListener("click", () => {
    if (busy) return;
    cubeRoot.rotation.set(
      (Math.random() - 0.5) * 0.8,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.4
    );
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
