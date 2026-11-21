(() => {
  let prevPrivacyBeforeBlur = null;

  window.addEventListener("blur", () => {
    const state = window.BimBam.getState();
    if (state.safeMode || !state.autoBlurOnUnfocus) return;
    prevPrivacyBeforeBlur = state.privacy;
    if (!state.privacy) {
      window.BimBam.setState({ privacy: true });
    }
  });

  window.addEventListener("focus", () => {
    const state = window.BimBam.getState();
    if (state.autoBlurOnUnfocus && prevPrivacyBeforeBlur === false) {
      window.BimBam.setState({ privacy: false });
    }
    prevPrivacyBeforeBlur = null;
  });

  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!anchor) return;

      try {
        const url = new URL(anchor.href);
        if (url.hostname.endsWith("l.facebook.com") && url.searchParams.has("u")) {
          const cleanUrl = new URL(url.searchParams.get("u"));
          cleanUrl.searchParams.delete("fbclid");
          anchor.href = cleanUrl.toString();
        } else if (url.searchParams.has("fbclid")) {
          url.searchParams.delete("fbclid");
          anchor.href = url.toString();
        }
      } catch {}
    },
    true
  );
})();
