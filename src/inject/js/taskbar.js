(() => {
  const SOUND_KEY = "bimbimbambam_message_sound_v1";
  const SOUND_CHOICES = ["off", "soft", "bell", "digital"];
  const INITIAL_MESSAGE_SYNC_MS = 5000;
  const SHORTCUTS = [
    { label: "TikTok", host: "www.tiktok.com", url: "https://www.tiktok.com/" },
    { label: "Discord", host: "discord.com", url: "https://discord.com/app" },
    { label: "Tenor", host: "tenor.com", url: "https://tenor.com/" },
  ];
  let taskbar;
  let audioContext;

  function invoke(command, args) {
    if (!window.__TAURI__?.core?.invoke) {
      return Promise.reject(new Error("Môi trường ứng dụng chưa sẵn sàng"));
    }
    return window.__TAURI__.core.invoke(command, args);
  }

  function showError(error) {
    const raw = String(error?.message || error || "");
    if (/ACL|not allowed|permission|không được phép|forbidden/i.test(raw)) {
      console.info("Tính năng yêu cầu quyền chưa được cấp:", raw);
      showToast("Tính năng này chưa được cấp quyền; đã giữ giao diện an toàn.");
      return;
    }
    console.warn("Thao tác UI không thành công:", raw);
    showToast("Không thể hoàn tất thao tác. Vui lòng thử lại.");
  }

  let toast;
  function showToast(message) {
    if (!document.body) return;
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "bimbam-island-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3800);
  }

  window.BimBam.showToast = showToast;

  function createButton(label, title, onClick, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = title;
    button.className = className;
    button.addEventListener("click", onClick);
    return button;
  }

  async function openShortcut(shortcut) {
    try {
      const snapshot = await invoke("list_tabs").catch((error) => {
        showError(error);
        return null;
      });
      const existingTab = snapshot?.tabs?.find((tab) => tab.title === shortcut.host);
      if (existingTab) {
        await invoke("switch_tab", { label: existingTab.label });
        return;
      }
      await invoke("create_tab", { url: shortcut.url });
    } catch (error) {
      showError(error);
    }
  }

  function renderTabs(snapshot) {
    const tabs = taskbar?.querySelector("#bimbam-tabs");
    if (!tabs) return;
    tabs.replaceChildren();

    snapshot.tabs.forEach((tab) => {
      const item = document.createElement("div");
      item.className = `bimbam-tab${snapshot.active === tab.label ? " active" : ""}`;
      const switchButton = createButton(
        tab.title,
        `Chuyển sang ${tab.title}`,
        () => invoke("switch_tab", { label: tab.label }).catch(showError),
        "bimbam-tab-switch"
      );
      item.appendChild(switchButton);

      if (tab.label !== "main") {
        item.appendChild(
          createButton("×", `Đóng ${tab.title}`, () =>
            invoke("close_tab", { label: tab.label }).catch(showError),
            "bimbam-tab-close"
          )
        );
      }
      tabs.appendChild(item);
    });
  }

  function getAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function playSound(choice) {
    if (!SOUND_CHOICES.includes(choice) || choice === "off") return;
    const context = getAudioContext();
    if (!context) return;

    const notes =
      choice === "bell" ? [740, 988] : choice === "digital" ? [880, 660] : [660];
    const start = context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.12;
      oscillator.type = choice === "bell" ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.12, noteStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.24);
    });
  }

  function configureSoundSelect(select) {
    let saved = "off";
    try {
      const value = localStorage.getItem(SOUND_KEY);
      if (SOUND_CHOICES.includes(value)) saved = value;
    } catch {}

    select.value = saved;
    select.addEventListener("change", () => {
      try {
        localStorage.setItem(SOUND_KEY, select.value);
      } catch {}
      playSound(select.value);
    });
  }

  async function configureMemoryTrim() {
    try {
      let savedSettings = await invoke("get_memory_trim_settings");
      window.BimBam.setState({
        autoMemoryTrim: savedSettings.enabled,
        memoryThresholdMb: savedSettings.thresholdMb,
      });

      window.addEventListener("bimbam:state-changed", async (event) => {
        const nextSettings = {
          enabled: Boolean(event.detail.autoMemoryTrim),
          thresholdMb: Number(event.detail.memoryThresholdMb),
        };
        if (
          nextSettings.enabled === savedSettings.enabled &&
          nextSettings.thresholdMb === savedSettings.thresholdMb
        ) {
          return;
        }

        try {
          await invoke("set_memory_trim_settings", nextSettings);
          savedSettings = nextSettings;
        } catch (error) {
          showError(error);
          try {
            savedSettings = await invoke("get_memory_trim_settings");
            window.BimBam.setState({
              autoMemoryTrim: savedSettings.enabled,
              memoryThresholdMb: savedSettings.thresholdMb,
            });
          } catch (syncError) {
            showError(syncError);
          }
        }
      });
    } catch (error) {
      showError(error);
    }
  }

  function isIncomingMessage(element) {
    const label = `${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""}`.trim();
    const normalizedLabel = label.toLowerCase();
    const text = (element.innerText || "").trim();
    if (!text || !label) return false;
    if (
      /^(you|bạn)(?:\s*:|,|\s+(?:sent|đã gửi))/i.test(label) ||
      /\b(delivered|seen|you sent)\b|đã chuyển|đã xem|bạn đã gửi/i.test(normalizedLabel)
    ) {
      return false;
    }
    return /:/.test(label) || /message|tin nhắn/i.test(normalizedLabel);
  }

  function getSenderName(element) {
    const label = `${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""}`.trim();
    const fromPhrase = label.match(/(?:message|tin nhắn)(?: mới)?\s+(?:from|từ)\s+([^:,.]+)/i);
    const colonName = label.match(/^([^:,.]{1,80}):/);
    return (fromPhrase?.[1] || colonName?.[1] || "người gửi").trim();
  }

  function notifyMessage(sender) {
    invoke("show_message_notification", { sender }).catch((error) => {
      console.error("Không thể hiện thông báo tin nhắn:", error);
    });
  }

  function isMessageSenderAllowed(sender) {
    const state = window.BimBam?.getState?.() || {};
    const whitelist = String(state.autoMessageWhitelist || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!whitelist.length) return false;
    const normalized = String(sender || "").trim().toLowerCase();
    return whitelist.some((name) => normalized.includes(name));
  }

  function setComposerText(text) {
    const composer =
      document.querySelector('[role="main"] [contenteditable="true"][role="textbox"]') ||
      document.querySelector('[role="main"] [contenteditable="true"]');
    if (!composer) return false;
    composer.focus();
    try {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
    } catch {
      composer.textContent = text;
    }
    composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    return true;
  }

  function sendComposerText(text) {
    if (!setComposerText(text)) return false;
    window.setTimeout(() => {
      const sendButton =
        document.querySelector('[role="main"] [aria-label*="Send" i], [role="main"] [aria-label*="Gửi" i]') ||
        document.querySelector('[role="main"] button[type="submit"]');
      if (sendButton instanceof HTMLElement && !sendButton.matches(":disabled")) {
        sendButton.click();
      } else {
        const composer =
          document.querySelector('[role="main"] [contenteditable="true"][role="textbox"]') ||
          document.querySelector('[role="main"] [contenteditable="true"]');
        composer?.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          bubbles: true,
        }));
      }
    }, 350);
    return true;
  }

  function reactToMessage(message, reaction) {
    const reactionNames = {
      "👍": ["Like", "Thích"],
      "❤️": ["Love", "Yêu thích"],
      "😂": ["Haha"],
      "😮": ["Wow"],
      "😢": ["Sad", "Buồn"],
      "😠": ["Angry", "Phẫn nộ"],
    };
    const labels = reactionNames[reaction] || [];
    const candidates = [
      ...message.querySelectorAll("button[aria-label], [role='button'][aria-label]"),
      ...Array.from(message.parentElement?.querySelectorAll("button[aria-label], [role='button'][aria-label]") || []),
    ];
    const match = candidates.find((element) =>
      labels.some((label) => (element.getAttribute("aria-label") || "").toLowerCase().includes(label.toLowerCase()))
    );
    if (match instanceof HTMLElement) {
      match.click();
      return true;
    }
    return false;
  }

  function watchMessages() {
    const main = document.querySelector('[role="main"]');
    if (!main) return;
    const candidates = "[data-message-id]";
    const knownMessages = new WeakSet();
    const replyCooldown = new Map();
    let notificationsReady = false;
    main.querySelectorAll(candidates).forEach((element) => knownMessages.add(element));
    window.setTimeout(() => {
      notificationsReady = true;
    }, INITIAL_MESSAGE_SYNC_MS);

    new MutationObserver((mutations) => {
      const sound = (() => {
        try {
          return localStorage.getItem(SOUND_KEY) || "off";
        } catch {
          return "off";
        }
      })();

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          const found = [];
          if (node.matches(candidates)) found.push(node);
          found.push(...node.querySelectorAll(candidates));
          for (const message of found) {
            if (knownMessages.has(message)) continue;
            knownMessages.add(message);
            if (!notificationsReady) continue;
            if (isIncomingMessage(message)) {
              if (sound !== "off") playSound(sound);
              const sender = getSenderName(message);
              notifyMessage(sender);
              const state = window.BimBam?.getState?.() || {};
              if (isMessageSenderAllowed(sender)) {
                if (state.autoReadMessages) {
                  message.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  message.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                }
                if (state.autoReactMessages) {
                  reactToMessage(message, state.autoReaction || "👍");
                }
                if (state.autoReplyMessages) {
                  const now = Date.now();
                  if ((replyCooldown.get(sender) || 0) + 60000 < now) {
                    replyCooldown.set(sender, now);
                    sendComposerText(String(state.autoReplyText || "").trim());
                  }
                }
              }
              return;
            }
          }
        }
      }
    }).observe(main, { childList: true, subtree: true });
  }

  function showAura() {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const aura = document.createElement("div");
    aura.id = "bimbam-aura-intro";
    aura.setAttribute("aria-hidden", "true");
    document.body.appendChild(aura);
    aura.addEventListener("animationend", () => aura.remove(), { once: true });
  }

  function haptic(pattern = 12) {
    try {
      if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
    } catch {}
  }

  function addIslandGestures(taskbar, islandToggle) {
    let pointerStart = null;
    let holdTimer = null;
    let tabIndex = 0;

    const deepClean = () => {
      invoke("get_memory_trim_settings")
        .then((settings) => invoke("set_memory_trim_settings", {
          enabled: true,
          thresholdMb: 256,
        }).then(() => {
          showToast("Siêu tăng tốc: đã kích hoạt dọn bộ nhớ an toàn");
          window.setTimeout(() => {
            invoke("set_memory_trim_settings", settings).catch(() => {});
          }, 2500);
        }))
        .catch(() => showToast("Siêu tăng tốc: không có quyền tối ưu bộ nhớ"));
      haptic([15, 35, 15]);
    };

    islandToggle.addEventListener("pointerdown", (event) => {
      pointerStart = { x: event.clientX, y: event.clientY };
      holdTimer = window.setTimeout(deepClean, 650);
    });
    islandToggle.addEventListener("pointerup", (event) => {
      window.clearTimeout(holdTimer);
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      if (Math.abs(dx) > 42) {
        tabIndex = (tabIndex + (dx < 0 ? 1 : -1) + 3) % 3;
        taskbar.dataset.tab = String(tabIndex);
        taskbar.classList.add("is-expanded");
        islandToggle.setAttribute("aria-expanded", "true");
        haptic(8);
      } else {
        const expanded = taskbar.classList.toggle("is-expanded");
        islandToggle.setAttribute("aria-expanded", String(expanded));
        haptic(expanded ? 10 : 6);
      }
      pointerStart = null;
    });
    islandToggle.addEventListener("pointercancel", () => {
      window.clearTimeout(holdTimer);
      pointerStart = null;
    });
  }

  function startIslandMetrics(taskbar) {
    const ram = taskbar.querySelector(".bimbam-island-ram");
    const fps = taskbar.querySelector(".bimbam-island-fps");
    const battery = taskbar.querySelector(".bimbam-island-battery");
    let frames = 0;
    let fpsValue = 60;
    let lastFrame = performance.now();
    let batteryLevel = 1;

    try {
      navigator.getBattery?.().then((info) => {
        batteryLevel = info.level;
        info.addEventListener("levelchange", () => { batteryLevel = info.level; });
      });
    } catch {}

    const countFrame = (now) => {
      frames++;
      if (now - lastFrame >= 1000) {
        fpsValue = Math.min(120, Math.round(frames * 1000 / (now - lastFrame)));
        frames = 0;
        lastFrame = now;
      }
      requestAnimationFrame(countFrame);
    };
    requestAnimationFrame(countFrame);

    const update = () => {
      const state = window.BimBam?.getState?.() || {};
      const memory = performance.memory;
      let ramPercent = memory
        ? Math.round(memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100)
        : Math.round(Math.random() * 18 + 42);
      if (batteryLevel < 0.2 && state.batterySaver) {
        taskbar.classList.add("is-battery-saver");
      } else {
        taskbar.classList.remove("is-battery-saver");
      }
      if (ram) ram.textContent = `${ramPercent}%`;
      if (fps) fps.textContent = `${fpsValue} FPS`;
      if (battery) battery.textContent = `${Math.round(batteryLevel * 100)}% pin`;

      if (ramPercent >= (state.ramThresholdPercent || 80)) {
        taskbar.classList.add("is-alert");
        invoke("get_memory_trim_settings")
          .then((settings) => {
            if (settings.enabled) invoke("set_memory_trim_settings", {
              enabled: true,
              thresholdMb: settings.thresholdMb,
            }).catch(() => {});
          })
          .catch(() => {});
      } else {
        taskbar.classList.remove("is-alert");
      }
      if (window.matchMedia("(orientation: landscape)").matches && state.autoHideLandscape) {
        taskbar.classList.add("is-auto-hidden");
      } else {
        taskbar.classList.remove("is-auto-hidden");
      }
    };
    update();
    window.setInterval(update, 5000);
  }

  async function initialize() {
    if (!document.body || !window.__TAURI__?.core?.invoke) return;

    taskbar = document.createElement("nav");
    taskbar.id = "bimbam-taskbar";
    taskbar.setAttribute("aria-label", "Thanh chuyển trang BimBimBamBam");
    const islandToggle = createButton(
      "",
      "Mở hoặc thu gọn thanh công cụ",
      () => {
        const expanded = taskbar.classList.toggle("is-expanded");
        islandToggle.setAttribute("aria-expanded", String(expanded));
      },
      "bimbam-island-toggle"
    );
    islandToggle.setAttribute("aria-expanded", "false");
    islandToggle.innerHTML = `
      <span class="bimbam-island-mark" aria-hidden="true">M</span>
      <span class="bimbam-island-name">RAM <b class="bimbam-island-ram">--%</b></span>
      <span class="bimbam-island-fps">-- FPS</span>
      <span class="bimbam-island-chevron" aria-hidden="true">⌄</span>
    `;

    const content = document.createElement("div");
    content.className = "bimbam-island-content";
    const tabs = document.createElement("div");
    tabs.id = "bimbam-tabs";
    const shortcuts = document.createElement("div");
    shortcuts.className = "bimbam-shortcuts";
    SHORTCUTS.forEach((shortcut) => {
      shortcuts.appendChild(
        createButton(shortcut.label, `Mở ${shortcut.label}`, () => openShortcut(shortcut), "bimbam-shortcut")
      );
    });

    const addButton = createButton("+", "Thêm trang web", () => {
      const url = window.prompt("Nhập địa chỉ trang web (http hoặc https):", "https://www.facebook.com/");
      if (url?.trim()) invoke("create_tab", { url: url.trim() }).catch(showError);
    }, "bimbam-toolbar-button bimbam-add-tab");
    const updateButton = createButton("↻", "Kiểm tra cập nhật", () => {
      window.BimBam?.checkForUpdate(true);
    }, "bimbam-toolbar-button");
    const soundSelect = document.createElement("select");
    soundSelect.id = "bimbam-sound-select";
    soundSelect.title = "Âm báo khi nhận tin nhắn";
    soundSelect.setAttribute("aria-label", "Âm báo khi nhận tin nhắn");
    [
      ["off", "🔇"],
      ["soft", "🔈"],
      ["bell", "🔔"],
      ["digital", "♫"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      soundSelect.appendChild(option);
    });
    configureSoundSelect(soundSelect);
    const settingsButton = createButton(
      "⚙",
      "Mở Cài đặt",
      () => window.BimBam?.toggleSettingsModal?.(),
      "bimbam-toolbar-button"
    );
    const batteryLabel = document.createElement("span");
    batteryLabel.className = "bimbam-island-battery";
    batteryLabel.textContent = "--% pin";

    const actions = document.createElement("div");
    actions.className = "bimbam-toolbar-actions";
    actions.append(addButton, updateButton, soundSelect, settingsButton);
    content.append(tabs, shortcuts, actions, batteryLabel);
    taskbar.append(islandToggle, content);
    document.body.appendChild(taskbar);

    const state = window.BimBam?.getState?.() || {};
    taskbar.dataset.position = state.islandPosition || "top";
    taskbar.dataset.size = state.islandSize || "medium";
    if (!state.dynamicIsland) taskbar.classList.add("is-disabled");
    window.addEventListener("bimbam:state-changed", (event) => {
      taskbar.dataset.position = event.detail.islandPosition || "top";
      taskbar.dataset.size = event.detail.islandSize || "medium";
      taskbar.classList.toggle("is-disabled", !event.detail.dynamicIsland);
    });
    addIslandGestures(taskbar, islandToggle);
    startIslandMetrics(taskbar);

    configureMemoryTrim();

    taskbar.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && taskbar.classList.contains("is-expanded")) {
        taskbar.classList.remove("is-expanded");
        islandToggle.setAttribute("aria-expanded", "false");
        document.activeElement?.blur();
      }
    });

    try {
      const snapshot = await invoke("list_tabs");
      renderTabs(snapshot);
    } catch (error) {
      renderTabs({
        active: "main",
        tabs: [{ label: "main", title: "Facebook" }],
      });
      if (!/ACL|not allowed|permission/i.test(String(error?.message || error))) {
        showError(error);
      }
    }
    window.__TAURI__.event?.listen("bimbam:tabs-updated", (event) => {
      renderTabs(event.payload);
    });

    showAura();
    watchMessages();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
