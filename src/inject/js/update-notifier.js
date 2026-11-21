(() => {
  const CACHE_KEY = "bimbimbambam_signed_update_check_v2";
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const RELEASES_URL = "https://github.com/ki4807071-dotcom/facebook/releases/latest";

  let banner = null;
  let toast = null;

  function errorDetails(error) {
    const message = error instanceof Error ? error.message : String(error || "");
    return message.trim().slice(0, 240) || "Lỗi không xác định";
  }

  function showToast(message) {
    if (!document.body) return;
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "bimbam-update-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = "block";
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.style.display = "none";
    }, 4000);
  }

  async function openReleasePage() {
    try {
      await window.__TAURI__.core.invoke("open_external_url", { url: RELEASES_URL });
    } catch (error) {
      console.error("Không thể mở trang tải ứng dụng:", error);
      showToast("Không thể mở trang tải ứng dụng");
    }
  }

  function showUpdateError(error) {
    if (!document.body) return;
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "bimbam-update-banner";
      document.body.appendChild(banner);
    }

    const title = document.createElement("strong");
    title.textContent = "Không thể cập nhật tự động";
    const details = document.createElement("span");
    details.className = "bimbam-update-notes";
    details.textContent = errorDetails(error);
    const downloadButton = document.createElement("button");
    downloadButton.id = "bimbam-update-download";
    downloadButton.type = "button";
    downloadButton.textContent = "Mở trang tải";
    downloadButton.addEventListener("click", openReleasePage);
    const closeButton = document.createElement("button");
    closeButton.id = "bimbam-update-close";
    closeButton.type = "button";
    closeButton.title = "Đóng";
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => {
      banner.style.display = "none";
    });

    banner.replaceChildren(title, details, downloadButton, closeButton);
    banner.style.display = "flex";
  }

  function showUpdate(update) {
    if (!document.body) return;
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "bimbam-update-banner";
      document.body.appendChild(banner);
    }

    const title = document.createElement("strong");
    title.textContent = `Có bản cập nhật ${update.version}`;
    const notes = document.createElement("span");
    notes.className = "bimbam-update-notes";
    notes.textContent = update.notes || "";
    const installButton = document.createElement("button");
    installButton.id = "bimbam-update-download";
    installButton.type = "button";
    installButton.textContent = "Tải và cài đặt";
    const closeButton = document.createElement("button");
    closeButton.id = "bimbam-update-close";
    closeButton.type = "button";
    closeButton.title = "Đóng";
    closeButton.textContent = "×";

    closeButton.onclick = () => {
      banner.style.display = "none";
    };
    installButton.onclick = async () => {
      installButton.disabled = true;
      installButton.textContent = "Đang cài đặt…";
      try {
        await window.__TAURI__.core.invoke("install_update");
        showToast("Đã cài đặt bản cập nhật, đang khởi động lại ứng dụng");
      } catch (error) {
        console.error("Không thể cài đặt bản cập nhật:", error);
        showUpdateError(error);
      }
    };

    banner.replaceChildren(title, notes, installButton, closeButton);
    banner.style.display = "flex";
  }

  async function checkForUpdate(force = false) {
    if (!document.body) return;

    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
          if (cached.update) {
            showUpdate(cached.update);
          }
          return;
        }
      } catch {}
    }

    try {
      const update = await window.__TAURI__.core.invoke("check_for_update");
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ checkedAt: Date.now(), update })
        );
      } catch (error) {
        console.warn("Không thể lưu bộ nhớ đệm kiểm tra cập nhật:", error);
      }

      if (update) {
        showUpdate(update);
      } else if (force) {
        showToast("Ứng dụng đang là bản mới nhất");
      }
    } catch (error) {
      console.error("Không thể kiểm tra cập nhật:", error);
      if (force) showUpdateError(error);
    }
  }

  window.BimBam.checkForUpdate = checkForUpdate;

  window.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(() => checkForUpdate(false), 1500);
  }, { once: true });

  if (window.__TAURI__?.event?.listen) {
    window.__TAURI__.event.listen("bimbam-check-update", () => {
      checkForUpdate(true);
    });
  }
})();
