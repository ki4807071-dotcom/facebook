(() => {
  const CACHE_KEY = "bimbimbambam_update_check_v1";
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const API_URL =
    "https://api.github.com/repos/ki4807071-dotcom/facebook/releases/latest";

  let banner = null;
  let toast = null;

  function parseVersion(value) {
    const match = String(value || "").trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)/);
    return match ? match.slice(1).map(Number) : null;
  }

  function isNewer(latest, current) {
    const next = parseVersion(latest);
    const installed = parseVersion(current);
    if (!next || !installed) return false;

    for (let index = 0; index < 3; index += 1) {
      if (next[index] !== installed[index]) {
        return next[index] > installed[index];
      }
    }
    return false;
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

  function showUpdate(release) {
    if (!document.body) return;
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "bimbam-update-banner";
      document.body.appendChild(banner);
    }

    banner.innerHTML = `
      <strong>Có bản cập nhật ${release.tag_name}</strong>
      <button id="bimbam-update-download" type="button">Cập nhật ngay</button>
      <button id="bimbam-update-close" type="button" title="Đóng">×</button>
    `;

    banner.querySelector("#bimbam-update-close").onclick = () => {
      banner.style.display = "none";
    };
    banner.querySelector("#bimbam-update-download").onclick = async () => {
      const url = release.html_url;
      try {
        await window.__TAURI__.core.invoke("open_external_url", { url });
      } catch {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    };
    banner.style.display = "flex";
  }

  async function checkForUpdate(force = false) {
    if (!document.body) return;
    const current = window.BimBam?.appVersion;
    if (!current) return;

    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
          if (cached.release && isNewer(cached.release.tag_name, current)) {
            showUpdate(cached.release);
          }
          return;
        }
      } catch {}
    }

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      const response = await fetch(API_URL, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);

      const release = await response.json();
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ checkedAt: Date.now(), release })
      );

      if (isNewer(release.tag_name, current)) {
        showUpdate(release);
      } else if (force) {
        showToast("Ứng dụng đang là bản mới nhất");
      }
    } catch {
      if (force) showToast("Không thể kiểm tra cập nhật");
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
