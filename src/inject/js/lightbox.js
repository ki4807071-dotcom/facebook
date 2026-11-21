(() => {
  let overlay = null;
  let scale = 1;
  let rotation = 0;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "bimbam-lightbox";
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(0, 0, 0, 0.9);
      display: none; align-items: center; justify-content: center;
      flex-direction: column; gap: 12px;
    `;
    overlay.innerHTML = `
      <div style="display:flex; gap:8px; background:rgba(24,26,32,0.94); padding:8px 12px; border-radius:10px; color:#fff; font-size:13px; font-family:system-ui,sans-serif;">
        <button id="bimbam-lb-zoom-in" style="cursor:pointer; padding:4px 8px;">Zoom +</button>
        <button id="bimbam-lb-zoom-out" style="cursor:pointer; padding:4px 8px;">Zoom -</button>
        <button id="bimbam-lb-rotate" style="cursor:pointer; padding:4px 8px;">Xoay 90°</button>
        <button id="bimbam-lb-reset" style="cursor:pointer; padding:4px 8px;">Reset</button>
        <a id="bimbam-lb-download" download="bimbam-image.jpg" style="color:#60a5fa; padding:4px 8px; text-decoration:none;">Tải ảnh</a>
        <button id="bimbam-lb-close" style="cursor:pointer; padding:4px 8px;">Đóng (Esc)</button>
      </div>
      <div id="bimbam-lb-stage" style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
        <img id="bimbam-lb-img" style="max-width:90vw; max-height:80vh; object-fit:contain; user-select:none;" />
      </div>
    `;

    document.body.appendChild(overlay);

    const image = overlay.querySelector("#bimbam-lb-img");
    const updateTransform = () => {
      image.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
    };

    overlay.querySelector("#bimbam-lb-zoom-in").onclick = () => {
      scale = Math.min(5, +(scale + 0.25).toFixed(2));
      updateTransform();
    };
    overlay.querySelector("#bimbam-lb-zoom-out").onclick = () => {
      scale = Math.max(0.25, +(scale - 0.25).toFixed(2));
      updateTransform();
    };
    overlay.querySelector("#bimbam-lb-rotate").onclick = () => {
      rotation = (rotation + 90) % 360;
      updateTransform();
    };
    overlay.querySelector("#bimbam-lb-reset").onclick = () => {
      scale = 1;
      rotation = 0;
      updateTransform();
    };
    overlay.querySelector("#bimbam-lb-close").onclick = closeLightbox;

    overlay.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        scale =
          event.deltaY < 0
            ? Math.min(5, +(scale + 0.15).toFixed(2))
            : Math.max(0.25, +(scale - 0.15).toFixed(2));
        updateTransform();
      },
      { passive: false }
    );

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.id === "bimbam-lb-stage") {
        closeLightbox();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.style.display === "flex") {
        closeLightbox();
      }
    });

    return overlay;
  }

  function openLightbox(src) {
    scale = 1;
    rotation = 0;
    const element = ensureOverlay();
    const image = element.querySelector("#bimbam-lb-img");
    const download = element.querySelector("#bimbam-lb-download");
    image.style.transform = "scale(1) rotate(0deg)";
    image.src = src;
    download.href = src;
    element.style.display = "flex";
  }

  function closeLightbox() {
    if (overlay) overlay.style.display = "none";
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const image = event.target.closest('[role="main"] img');
      if (!image || !image.src) return;
      const rect = image.getBoundingClientRect();
      if (rect.width < 48 && rect.height < 48) return;
      event.preventDefault();
      event.stopPropagation();
      openLightbox(image.src);
    },
    true
  );
})();
