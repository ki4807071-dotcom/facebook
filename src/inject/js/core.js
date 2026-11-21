(() => {
  const STORAGE_KEY = "bimbimbambam_state_v1";

  const DEFAULT_STATE = {
    noAnim: true,
    lowGpu: true,
    contain: true,
    clean: true,
    zen: false,
    miniSidebar: false,
    privacy: false,
    autoBlurOnUnfocus: false,
    sigmaMode: false,
    theme: "default",
    safeMode: false,
    autoMemoryTrim: true,
    memoryThresholdMb: 1024,
    dynamicIsland: true,
    ramThresholdPercent: 80,
    islandPosition: "top",
    islandSize: "medium",
    autoHideLandscape: true,
    batterySaver: true,
    whitelist: "",
    autoReadMessages: false,
    autoReplyMessages: false,
    autoReactMessages: false,
    autoMessageWhitelist: "",
    autoReplyText: "Xin chào! Mình đã nhận được tin nhắn.",
    autoReaction: "👍",
  };

  window.BimBam = window.BimBam || {};

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  function saveState(nextState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch {}
  }

  let currentState = loadState();

  function syncDomClasses() {
    const html = document.documentElement;
    const managedClasses = [
      "bimbam-no-anim",
      "bimbam-low-gpu",
      "bimbam-contain",
      "bimbam-clean",
      "bimbam-zen",
      "bimbam-mini-sidebar",
      "bimbam-privacy",
      "bimbam-sigma",
      "bimbam-theme-oled",
      "bimbam-theme-slate",
    ];
    html.classList.remove(...managedClasses);

    if (currentState.safeMode) return;

    if (currentState.noAnim) html.classList.add("bimbam-no-anim");
    if (currentState.lowGpu) html.classList.add("bimbam-low-gpu");
    if (currentState.contain) html.classList.add("bimbam-contain");
    if (currentState.clean) html.classList.add("bimbam-clean");
    if (currentState.zen) html.classList.add("bimbam-zen");
    if (currentState.miniSidebar) html.classList.add("bimbam-mini-sidebar");
    if (currentState.privacy) html.classList.add("bimbam-privacy");
    if (currentState.sigmaMode) html.classList.add("bimbam-sigma");
    if (currentState.theme === "oled") html.classList.add("bimbam-theme-oled");
    if (currentState.theme === "slate") html.classList.add("bimbam-theme-slate");
  }

  window.BimBam.getState = () => ({ ...currentState });

  window.BimBam.setState = (patch) => {
    currentState = { ...currentState, ...patch };
    saveState(currentState);
    syncDomClasses();
    window.dispatchEvent(new CustomEvent("bimbam:state-changed", { detail: currentState }));
  };

  window.BimBam.toggleFlag = (key) => {
    window.BimBam.setState({ [key]: !currentState[key] });
  };

  function focusComposerSoon() {
    setTimeout(() => {
      const composer =
        document.querySelector('[role="main"] [contenteditable="true"][role="textbox"]') ||
        document.querySelector('[role="main"] [contenteditable="true"]');
      if (composer) composer.focus();
    }, 120);
  }

  document.addEventListener("click", (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest('[role="navigation"] [role="listitem"]')
    ) {
      focusComposerSoon();
    }
  });

  if (document.documentElement) {
    syncDomClasses();
  }
  window.addEventListener("DOMContentLoaded", syncDomClasses, { once: true });
})();
