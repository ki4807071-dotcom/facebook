(() => {
  let cursor = null;
  let pointerTimer = null;
  let lastParticleAt = 0;

  function ensureCursor() {
    if (!document.body) return null;
    if (!cursor) {
      cursor = document.createElement("div");
      cursor.id = "bimbam-sigma-cursor";
      document.body.appendChild(cursor);
    }
    return cursor;
  }

  function setCursorVisible(visible) {
    ensureCursor();
    if (cursor) cursor.classList.toggle("active", visible);
  }

  function spawnParticles(event) {
    if (!document.documentElement.classList.contains("bimbam-sigma")) return;
    if (event.pointerType === "touch") return;
    const now = Date.now();
    if (now - lastParticleAt < 90) return;
    lastParticleAt = now;

    for (let index = 0; index < 5; index += 1) {
      const particle = document.createElement("span");
      const angle = (Math.PI * 2 * index) / 5 + Math.random() * 0.35;
      const distance = 16 + Math.random() * 24;
      particle.className = "bimbam-sigma-particle";
      particle.style.left = `${event.clientX}px`;
      particle.style.top = `${event.clientY}px`;
      particle.style.setProperty(
        "--bimbam-x",
        `${Math.cos(angle) * distance + (Math.random() - 0.5) * 10}px`
      );
      particle.style.setProperty(
        "--bimbam-y",
        `${Math.sin(angle) * distance + (Math.random() - 0.5) * 10}px`
      );
      document.body.appendChild(particle);
      particle.addEventListener("animationend", () => particle.remove(), { once: true });
    }
  }

  document.addEventListener("pointermove", (event) => {
    if (!document.documentElement.classList.contains("bimbam-sigma")) {
      setCursorVisible(false);
      return;
    }

    const glow = ensureCursor();
    if (!glow) return;
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
    setCursorVisible(true);
    window.clearTimeout(pointerTimer);
    pointerTimer = window.setTimeout(() => setCursorVisible(false), 900);
  }, { passive: true });

  document.addEventListener("pointerdown", spawnParticles, { passive: true });

  window.addEventListener("bimbam:state-changed", (event) => {
    if (!event.detail?.sigmaMode) setCursorVisible(false);
  });
})();
