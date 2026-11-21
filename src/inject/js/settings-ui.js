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
    { key: "dynamicIsland", label: "Bật Dynamic Island" },
    { key: "autoHideLandscape", label: "Tự ẩn khi xoay ngang" },
    { key: "batterySaver", label: "Tiết kiệm pin dưới 20%" },
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
        <div style="position:relative; display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div style="position:absolute; left:50%; top:-2px; transform:translateX(-50%); text-align:center;">
            <div style="width:54px;height:54px;margin:0 auto 6px;border-radius:16px;background:linear-gradient(135deg,#6C5CE7,#4895EF);display:grid;place-items:center;font-size:28px;font-weight:800;box-shadow:0 8px 24px rgba(108,92,231,.32);">M</div>
            <strong style="font-size:14px;">BimBimBamBam</strong>
            <div style="font-size:10px;color:#9ca3af;margin-top:2px;">v${window.BimBam.appVersion || ""}</div>
          </div>
          <strong style="font-size:15px;opacity:0;">Settings</strong>
          <button id="bimbam-settings-close" style="background:transparent; border:none; color:#9ca3af; font-size:18px; cursor:pointer;">✕</button>
        </div>

        <div style="height:72px;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <label style="font-size:12px;color:#cbd5e1;">Vị trí
            <select id="bimbam-island-position" style="width:100%;margin-top:5px;background:#20242e;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:7px;">
              <option value="top" ${state.islandPosition === "top" ? "selected" : ""}>Trên</option>
              <option value="bottom" ${state.islandPosition === "bottom" ? "selected" : ""}>Dưới</option>
            </select>
          </label>
          <label style="font-size:12px;color:#cbd5e1;">Kích thước
            <select id="bimbam-island-size" style="width:100%;margin-top:5px;background:#20242e;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:7px;">
              <option value="small" ${state.islandSize === "small" ? "selected" : ""}>Nhỏ</option>
              <option value="medium" ${state.islandSize === "medium" ? "selected" : ""}>Vừa</option>
              <option value="large" ${state.islandSize === "large" ? "selected" : ""}>Lớn</option>
            </select>
          </label>
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
          <label style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-size:13px;">Ngưỡng Fix Lag (%)</span>
            <input id="bimbam-ram-percent" type="number" min="50" max="95" step="1" value="${state.ramThresholdPercent}" style="width:92px; background:#20242e; color:#fff; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px 8px; font-size:12px;" />
          </label>
          <label style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:10px 0;">
            <span style="font-size:13px;">Whitelist</span>
            <textarea id="bimbam-whitelist" rows="2" placeholder="example.com, app.exe" style="width:180px;resize:vertical;background:#20242e;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:6px;font-size:12px;">${String(state.whitelist || "").replace(/[<&>]/g, "")}</textarea>
          </label>
          <button id="bimbam-check-update" type="button" style="width:100%;min-height:38px;margin-top:6px;border:0;border-radius:9px;background:linear-gradient(135deg,#6C5CE7,#4895EF);color:#fff;font-weight:700;cursor:pointer;">Kiểm tra cập nhật GitHub</button>
          <small style="display:block; padding:8px 0; color:#9ca3af; font-size:11px;">
            Chỉ tối ưu bộ nhớ an toàn của tiến trình app; không đóng app hoặc xóa file.
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

    modal.querySelector("#bimbam-island-position").onchange = (event) => {
      window.BimBam.setState({ islandPosition: event.target.value });
    };

    modal.querySelector("#bimbam-island-size").onchange = (event) => {
      window.BimBam.setState({ islandSize: event.target.value });
    };

    modal.querySelector("#bimbam-ram-percent").onchange = (event) => {
      const ramThresholdPercent = Number(event.target.value);
      if (!Number.isInteger(ramThresholdPercent) || ramThresholdPercent < 50 || ramThresholdPercent > 95) {
        event.target.value = state.ramThresholdPercent;
        window.BimBam.showToast?.("Ngưỡng Fix Lag phải từ 50 đến 95%");
        return;
      }
      window.BimBam.setState({ ramThresholdPercent });
    };

    modal.querySelector("#bimbam-whitelist").onchange = (event) => {
      window.BimBam.setState({ whitelist: event.target.value.trim() });
    };

    modal.querySelector("#bimbam-check-update").onclick = () => {
      window.BimBam.checkForUpdate?.(true);
    };

    modal.querySelector("#bimbam-memory-threshold").onchange = (event) => {
      const thresholdMb = Number(event.target.value);
      if (!Number.isInteger(thresholdMb) || thresholdMb < 256 || thresholdMb > 32768) {
        event.target.value = state.memoryThresholdMb;
        window.BimBam.showToast?.("Ngưỡng RAM phải từ 256 đến 32768 MB.");
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
