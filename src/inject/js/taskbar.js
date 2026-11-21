(() => {
  const SOUND_KEY = "bimbimbambam_message_sound_v1";
  const SOUND_CHOICES = ["off", "soft", "bell", "digital"];
  const INITIAL_MESSAGE_SYNC_MS = 5000;
  let taskbar;
  let audioContext;

  function invoke(command, args) {
    return window.__TAURI__?.core?.invoke(command, args);
  }

  function showError(error) {
    window.alert(`Không thể thực hiện thao tác: ${error?.message || error}`);
  }

  function createButton(label, title, onClick, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = title;
    button.className = className;
    button.addEventListener("click", onClick);
    return button;
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

  function watchMessages() {
    const main = document.querySelector('[role="main"]');
    if (!main) return;
    const candidates = "[data-message-id]";
    const knownMessages = new WeakSet();
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
              notifyMessage(getSenderName(message));
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

  async function initialize() {
    if (!document.body || !window.__TAURI__?.core?.invoke) return;

    taskbar = document.createElement("nav");
    taskbar.id = "bimbam-taskbar";
    taskbar.setAttribute("aria-label", "Thanh chuyển trang BimBimBamBam");
    const tabs = document.createElement("div");
    tabs.id = "bimbam-tabs";

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

    taskbar.append(tabs, addButton, updateButton, soundSelect);
    document.body.appendChild(taskbar);

    try {
      renderTabs(await invoke("list_tabs"));
    } catch (error) {
      showError(error);
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
