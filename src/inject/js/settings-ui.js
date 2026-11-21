(() => {
  let modal = null;
  let fab = null;

  const TOGGLES = [
    { key: "noAnim", label: "Tắt Animation & Transition" },
    { key: "lowGpu", label: "Giảm tải GPU (tắt shadow/blur nặng)" },
    { key: "contain", label: "Cô lập render khi cuộn chat dài" },
    { key: "clean", label: "Dọn dẹp giao diện thừa (Stories/Banner)" },
    { key: "miniSidebar", label: "Mini Sidebar (Ctrl/Cmd + Shift + M)" },
    { key: "zen", label: "Zen Mode (Ctrl/Cmd + Shift + F)" },
    { key: "privacy", label: "Privacy Blur (Ctrl/Cmd + B)" },
    { key: "autoBlurOnUnfocus", label: "Tự làm mờ khi mất focus cửa sổ" },
    { key: "sigmaMode", label: "Sigma Effects (Ctrl/Cmd + Shift + S)" },
    { key: "autoMemoryTrim", label: "Tự tối ưu RAM của app khi RAM trống thấp" },
    { key: "safeMode", label: "Safe Mode / Kill-switch (Ctrl/Cmd + Shift + R)" },
  ];

  function renderModalContent() {
    if (!modal) return;
    const state = window.BimBam.getState();

    const rowsHtml = TOGGLES.map(
      (toggle) => `
      <label style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08); cursor:pointer;">
        <span style="font-size:13px;">${toggle.label}</span>
        <input type="checkbox" data-key="${toggle.key}" ${state[toggle.key] ? "checked" : ""} style="width:16px; height:16px; cursor:pointer;" />
      </label>
    `
    ).join("");

    modal.innerHTML = `
      <div style="width:420px; max-width:92vw; background:#14161c; color:#f3f4f6; border:1px solid rgba(255,255,255,0.14); border-radius:14px; padding:18px; font-family:system-ui,-apple-system,sans-serif; box-shadow:0 20px 50px rgba(0,0,0,0.55);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <strong style="font-size:15px;">BimBimBamBam — Settings</strong>
          <button id="bimbam-settings-close" style="background:transparent; border:none; color:#9ca3af; font-size:18px; cursor:pointer;">✕</button>
        </div>

        <div style="margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:13px;">Theme</span>
          <select id="bimbam-theme-select" style="background:#20242e; color:#fff; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px 8px; font-size:12px;">
            <option value="default" ${state.theme === "default" ? "selected" : ""}>Default</option>
            <option value="oled" ${state.theme === "oled" ? "selected" : ""}>OLED Pure Black</option>
            <option value="slate" ${state.theme === "slate" ? "selected" : ""}>Minimalist Slate</option>
          </select>
        </div>

        <div style="max-height:55vh; overflow-y:auto; padding-right:4px;">
          ${rowsHtml}
          <label style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-size:13px;">Ngưỡng RAM trống (MB)</span>
            <input id="bimbam-memory-threshold" type="number" min="256" max="32768" step="1" style="width:92px; background:#20242e; color:#fff; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px 8px; font-size:12px;" />
          </label>
          <small style="display:block; padding:8px 0; color:#9ca3af; font-size:11px;">
            Chỉ tối ưu bộ nhớ của tiến trình app; không đóng app khác hoặc xóa file.
          </small>
        </div>
      </div>
    `;

    modal.querySelector("#bimbam-settings-close").onclick = () => {
      modal.style.display = "none";
    };

    modal.querySelector("#bimbam-memory-threshold").value =
      String(state.memoryThresholdMb);

    modal.querySelector("#bimbam-theme-select").onchange = (event) => {
      window.BimBam.setState({ theme: event.target.value });
    };

    modal.querySelector("#bimbam-memory-threshold").onchange = (event) => {
      const thresholdMb = Number(event.target.value);
      if (!Number.isInteger(thresholdMb) || thresholdMb < 256 || thresholdMb > 32768) {
        window.alert("Ngưỡng RAM phải từ 256 đến 32768 MB.");
        event.target.value = state.memoryThresholdMb;
        return;
      }
      window.BimBam.setState({ memoryThresholdMb: thresholdMb });
    };

    modal.querySelectorAll('input[type="checkbox"][data-key]').forEach((input) => {
      input.onchange = (event) => {
        const key = event.target.getAttribute("data-key");
        window.BimBam.setState({ [key]: event.target.checked });
      };
    });
  }

  function ensureUI() {
    if (!document.body) return;

    if (!fab) {
      fab = document.createElement("button");
      fab.id = "bimbam-settings-fab";
      fab.textContent = "⚙";
      fab.title = "BimBimBamBam Settings (Cmd/Ctrl + ,)";
      fab.style.cssText = `
        position: fixed; right: 16px; bottom: 16px; z-index: 999990;
        width: 36px; height: 36px; border-radius: 50%;
        background: rgba(20, 22, 28, 0.88); color: #fff;
        border: 1px solid rgba(255,255,255,0.16);
        cursor: pointer; font-size: 16px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.35);
      `;
      fab.onclick = () => window.BimBam.toggleSettingsModal();
      document.body.appendChild(fab);
    }

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "bimbam-settings-modal";
      modal.style.cssText = `
        position: fixed; inset: 0; z-index: 999995;
        background: rgba(0,0,0,0.45);
        display: none; align-items: center; justify-content: center;
      `;
      modal.addEventListener("click", (event) => {
        if (event.target === modal) modal.style.display = "none";
      });
      document.body.appendChild(modal);
    }
  }

  window.BimBam.toggleSettingsModal = () => {
    ensureUI();
    if (!modal) return;
    if (modal.style.display === "flex") {
      modal.style.display = "none";
    } else {
      renderModalContent();
      modal.style.display = "flex";
    }
  };

  window.addEventListener("DOMContentLoaded", ensureUI, { once: true });
  window.addEventListener("bimbam:state-changed", () => {
    if (modal && modal.style.display === "flex") {
      renderModalContent();
    }
  });
})();
