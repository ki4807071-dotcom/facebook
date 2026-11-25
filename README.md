# <img src="src-tauri/icons/icon.png" alt="Logo BimBimBamBam" width="48" valign="middle"> BimBimBamBam

Ứng dụng desktop Tauri mở Messenger trong webview và bổ sung các tùy chọn giao diện, phím tắt, làm mờ nội dung, cùng chế độ xem ảnh.

## Yêu cầu

- Node.js và npm
- Rust toolchain
- Các thư viện hệ thống cần thiết để build Tauri 2 trên nền tảng của bạn

## Cài đặt và chạy

```bash
npm install
npm run dev
```

Đóng gói ứng dụng:

```bash
npm run build
```

## Dùng làm ứng dụng chat độc lập

Ứng dụng mở Messenger mặc định. Có thể chọn một trang chat khác bằng biến môi trường
`BIMBAM_CHAT_URL` (chỉ chấp nhận URL HTTP/HTTPS có hostname), ví dụ:

```bash
BIMBAM_CHAT_URL=https://web.whatsapp.com npm run dev
```

Tệp `themes/custom.css` là theme mẫu và được đóng gói cùng ứng dụng. Để dùng CSS riêng,
đặt đường dẫn tuyệt đối trong `BIMBAM_THEME_CSS`; tệp theme được giới hạn tối đa 256 KiB
và được nạp khi khởi chạy:

```bash
BIMBAM_THEME_CSS="$HOME/.config/bimbimbambam/custom.css" npm run dev
```

Các link HTTP(S) khác origin được mở bằng trình duyệt mặc định. Mục **Khởi động cùng hệ
thống** trong cài đặt bật/tắt autostart; cửa sổ chính tự ẩn xuống khay khi đóng và trạng
thái/kích thước được lưu bởi plugin window-state. Dùng `BIMBAM_CHAT_URL` để thay đổi trang
đích; nếu trang đó cần thêm các hostname phụ, hãy cập nhật capability URL phù hợp trong
`src-tauri/capabilities/default.json`.

Build theo nền tảng (cần cài các thư viện phát triển Tauri của hệ điều hành đích):

```bash
# Windows: installer NSIS .exe
npm run tauri -- build --bundles nsis

# macOS: .dmg
npm run tauri -- build --bundles dmg

# Linux: AppImage portable hoặc gói .deb
npm run tauri -- build --bundles appimage
npm run tauri -- build --bundles deb
```

Tạo executable Windows không đóng gói installer:

```bash
cargo build --release --manifest-path src-tauri/Cargo.toml
```

Binary nằm tại `src-tauri/target/release/bimbimbambam.exe`. Windows cần WebView2 Runtime
(thường đã có sẵn trên Windows 10/11); app dùng profile WebView và thư mục cấu hình của
tài khoản hiện tại, nên executable portable không đồng nghĩa với dữ liệu/profile portable.
Trên macOS, dùng `.dmg`; trên Linux, AppImage là lựa chọn chạy không cần cài gói hệ thống.

Vì cấu hình updater bật tạo artifact có chữ ký, build production cần `TAURI_SIGNING_PRIVATE_KEY` và `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Trên Linux, lệnh trên tạo gói Debian `.deb` tại `src-tauri/target/release/bundle/deb/`. Bản release bật tối ưu kích thước và strip symbol debug. Để build gói thường không ký, dùng overlay CI:

```bash
npm run tauri -- build --config src-tauri/tauri.ci.conf.json
```

Mỗi lần push lên GitHub, workflow Windows sẽ tạo bộ cài `.exe`. Tải file trong mục **Actions**, mở lần chạy tương ứng và tải artifact `BimBimBamBam-windows-...` (artifact được lưu 14 ngày).

Build script gộp `src/inject/css` và `src/inject/js` thành tài nguyên được nhúng vào ứng dụng. Thay đổi các tệp này sẽ được build.rs theo dõi.

## Tauri updater có chữ ký

Workflow phát hành ở `.github/workflows/release-windows.yml` tạo installer NSIS có chữ ký, file `.sig` và `latest.json`, rồi đính kèm cả ba vào GitHub Release. Hiện workflow tự động chỉ phát hành `windows-x86_64`; script cũng hỗ trợ thêm các platform khác khi đã có artifact và chữ ký tương ứng.

### 1. Tạo và bảo vệ khóa

Tạo khóa ngoài repository (không lưu trong thư mục dự án):

```bash
mkdir -p ~/.tauri
read -rsp "Choose a Tauri key password: " KEY_PASSWORD
printf '\n'
npm run tauri signer generate -- -w ~/.tauri/bimbimbambam.key -p "$KEY_PASSWORD"
unset KEY_PASSWORD
```

Lệnh in public key ra terminal. Sao chép **public key** vào `plugins.updater.pubkey` trong `src-tauri/tauri.conf.json`; đây là chuỗi khóa, không phải đường dẫn tệp. Giá trị `REPLACE_WITH_PUBLIC_KEY_FROM_TAURI_SIGNER` hiện tại chỉ là placeholder và phải được thay trước khi phát hành.

Private key phải được giữ ngoài Git, sao lưu an toàn và không gửi vào log. `*.key` đã được thêm vào `.gitignore`, nhưng vẫn nên tạo khóa ở `~/.tauri/`. Tauri CLI đọc `TAURI_SIGNING_PRIVATE_KEY` và `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` từ environment; `.env` không được Tauri CLI tự nạp.

Trên GitHub vào **Settings → Secrets and variables → Actions**, tạo secrets:

- `TAURI_SIGNING_PRIVATE_KEY`: toàn bộ nội dung private key.
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: mật khẩu đã dùng để tạo khóa (để trống nếu khóa không có mật khẩu).

Không đặt private key vào `tauri.conf.json`, workflow, source code hoặc commit.

### 2. Cấu hình build

`src-tauri/tauri.conf.json` bật `bundle.createUpdaterArtifacts`, public key và endpoint:

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "pubkey": "PUBLIC_KEY_FROM_TAURI_SIGNER",
      "endpoints": [
        "https://github.com/ki4807071-dotcom/facebook/releases/latest/download/latest.json"
      ]
    }
  }
}
```

Trước mỗi release, đồng bộ version trong `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` và `package.json` với tag Git (ví dụ `v0.1.2` ↔ `0.1.2`). Tauri v2 tạo installer Windows và chữ ký cạnh nhau, ví dụ `*-setup.exe` và `*-setup.exe.sig`.

### 3. Build và phát hành thủ công

Trong Bash/Git Bash tại thư mục repository, đặt biến môi trường cho phiên terminal hiện tại rồi build:

```bash
export TAURI_SIGNING_PRIVATE_KEY="$HOME/.tauri/bimbimbambam.key"
read -rsp "Tauri key password (Enter if none): " TAURI_SIGNING_PRIVATE_KEY_PASSWORD
printf '\n'
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD

npm ci
npm run tauri -- build --bundles nsis
```

Script đọc file `.sig` tương ứng, xác nhận version khớp với ba manifest và sinh `latest.json`:

```bash
EXE="$(find src-tauri/target/release/bundle/nsis -maxdepth 1 -name '*-setup.exe' -print -quit)"
RELEASE_NOTES="BimBimBamBam 0.1.2" \
  node scripts/generate-latest-json.mjs \
  v0.1.2 ki4807071-dotcom/facebook "windows-x86_64=$EXE"
```

Đính kèm installer, chữ ký và manifest vào cùng release:

```bash
gh release create v0.1.2 "$EXE" "$EXE.sig" latest.json \
  --title "BimBimBamBam v0.1.2" --generate-notes
```

Máy phát hành thủ công cần GitHub CLI đã đăng nhập bằng `gh auth login`.

Nếu release đã tồn tại, thay asset cũ bằng:

```bash
gh release upload v0.1.2 "$EXE" "$EXE.sig" latest.json --clobber
```

Sau khi build, có thể xóa biến khỏi terminal bằng `unset TAURI_SIGNING_PRIVATE_KEY TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

### 4. Nội dung `latest.json`

Script tạo ngày `pub_date` theo RFC 3339/ISO 8601 UTC, lấy chữ ký nguyên văn từ `.sig`, và tạo URL tải trực tiếp đúng tên asset trong release. Ví dụ minh họa:

```json
{
  "version": "0.1.2",
  "notes": "BimBimBamBam 0.1.2",
  "pub_date": "2026-11-21T16:00:00.000Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "Nội dung thực tế của file .sig",
      "url": "https://github.com/ki4807071-dotcom/facebook/releases/download/v0.1.2/BimBimBamBam_0.1.2_x64-setup.exe"
    }
  }
}
```

`signature` không phải đường dẫn hoặc URL; nó phải là nội dung file `.sig`. Các key platform theo dạng `OS-ARCH`, ví dụ `windows-aarch64`, `darwin-x86_64`, `darwin-aarch64`, `linux-x86_64`. Chỉ đưa vào manifest những platform thực sự đã build và ký. Để thêm platform, truyền thêm đối số `platform=đường-dẫn-artifact` cho script; file `.sig` phải nằm ngay cạnh artifact.

Endpoint `releases/latest/download/latest.json` yêu cầu release đã publish và repository công khai (hoặc client có cơ chế xác thực riêng).

Nút cập nhật trong app gọi runtime `tauri-plugin-updater` để kiểm tra feed, tải và xác minh chữ ký trước khi cài, sau đó khởi động lại ứng dụng. Quá trình này chỉ hoạt động khi public key trong cấu hình khớp với private key đã ký artifact.

### 5. GitHub Actions

Push tag `v*` sẽ chạy `.github/workflows/release-windows.yml`: build có signing secrets, tạo manifest và publish installer + `.sig` + `latest.json`. Có thể chạy thủ công bằng **Actions → Signed Windows updater release → Run workflow** với tag đã tồn tại. Workflow kiểm tra tag có cùng version trong ba manifest trước khi phát hành.

Workflow build installer cho branch dùng `src-tauri/tauri.ci.conf.json` để tắt tạo updater artifacts, tránh cần private key cho CI thường. Chỉ workflow phát hành mới nhận signing secrets.

### Lỗi thường gặp

- **Sai chữ ký:** khóa build phải khớp public key trong cấu hình; giữ nguyên private key qua các release. Nếu mất hoặc đổi khóa, người dùng hiện tại không thể xác minh bản cập nhật mới.
- **URL sai tên:** `url` phải trỏ đúng asset đã upload; script dùng basename thực tế của artifact.
- **Ngày sai:** `pub_date` phải là RFC 3339; script tự sinh bằng `toISOString()`.
- **Không có `.sig`:** xác nhận `bundle.createUpdaterArtifacts: true` và hai signing secrets có mặt trong workflow phát hành.
- **Không tải được `latest.json`:** đảm bảo file được upload với đúng tên chữ thường `latest.json`, release đã publish (không phải draft), và endpoint khớp repository.
- **Version không khớp:** dùng cùng version trong Tauri config, Cargo, package.json và tag.

## Tính năng

- Chế độ không animation, giảm hiệu ứng GPU, tối giản và thu gọn thanh bên.
- Zen mode, làm mờ nội dung riêng tư, và tự làm mờ khi cửa sổ mất focus.
- Giao diện OLED/Slate, trình xem ảnh, và phím tắt `Ctrl/Cmd + ,`, `K`, `B`, `Shift + F`, `Shift + M`, `Shift + S`, `Shift + R` và `1–9`.
- Sigma Effects: glow, hiệu ứng glass nhẹ, hover nổi và particle ambient bằng `Ctrl/Cmd + Shift + S`.
- Thanh “Dynamic Island” thu gọn/mở rộng mượt ở đầu cửa sổ, với tab web và nút mở nhanh TikTok, Discord, Tenor; có nút thoát ứng dụng riêng.
- Tự tối ưu working set của tiến trình ứng dụng khi RAM khả dụng thấp hơn ngưỡng đã chọn; không đụng tới tiến trình khác hay xóa tệp.
- Thanh tab web để mở và chuyển nhanh nhiều trang; có thể đóng tab riêng mà không mất trạng thái của các trang khác.
- Chọn âm báo khi nhận tin nhắn (tắt, nhẹ, chuông hoặc âm điện tử) ngay trên thanh tab; hiệu ứng aura xuất hiện khi trang vừa mở.
- Hiện thông báo hệ thống khi nhận tin nhắn mới: “Ê Sigma, bạn nhận tin nhắn mới từ {tên người gửi}”.
- Logo ứng dụng hiển thị trong khay hệ thống khi cửa sổ được ẩn; bấm biểu tượng để mở lại.
- Tự kiểm tra phiên bản mới từ GitHub và hiện banner “Cập nhật ngay”; mục “Kiểm tra cập nhật” trong biểu tượng khay cho phép kiểm tra thủ công.
- Một số URL có dấu hiệu theo dõi bị chặn trong quá trình điều hướng.
- Single-instance đưa cửa sổ đang chạy lên trước; có thể bật autostart trong cài đặt.
- Theme CSS ngoài được nạp lúc khởi động; không có telemetry hoặc máy chủ trung gian.

## Ghi chú

Đây là ứng dụng không chính thức, không dùng Facebook API và không trích xuất cookie hay thông tin đăng nhập. Đăng nhập trực tiếp trong cửa sổ Messenger; khả năng sử dụng phụ thuộc vào chính sách và thay đổi giao diện của Meta. Tùy chọn chặn điều hướng có thể ảnh hưởng đến một số chức năng của Messenger.

Nếu cần thay biểu tượng, tạo một ảnh PNG vuông rồi chạy:

```bash
npx tauri icon path/to/your-app-icon.png
```
