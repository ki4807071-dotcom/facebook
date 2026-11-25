(() => {
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!link || !window.__TAURI__?.core?.invoke) return;

      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }

      if (!["http:", "https:"].includes(url.protocol) || url.origin === window.location.origin) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      window.__TAURI__.core.invoke("open_external_url", { url: url.href }).catch((error) => {
        console.error("Could not open link in the system browser:", error);
      });
    },
    true
  );
})();
