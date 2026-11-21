(() => {
  window.addEventListener(
    "keydown",
    (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      if (event.key === ",") {
        event.preventDefault();
        window.BimBam.toggleSettingsModal?.();
        return;
      }

      if (event.key.toLowerCase() === "k") {
        const searchInput =
          document.querySelector('[role="navigation"] input[type="search"]') ||
          document.querySelector('[role="navigation"] [aria-label*="search" i]') ||
          document.querySelector('[role="navigation"] [aria-label*="tìm kiếm" i]');
        if (searchInput) {
          event.preventDefault();
          searchInput.focus();
        }
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        window.BimBam.toggleFlag("zen");
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        window.BimBam.toggleFlag("miniSidebar");
        return;
      }

      if (!event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        window.BimBam.toggleFlag("privacy");
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        window.BimBam.toggleFlag("safeMode");
        return;
      }

      if (!event.shiftKey && /^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const items = document.querySelectorAll('[role="navigation"] [role="listitem"]');
        const target =
          items[index]?.querySelector('a, [role="link"], [tabindex]') || items[index];
        if (target) {
          event.preventDefault();
          target.click();
        }
      }
    },
    true
  );
})();
