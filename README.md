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

Trên Linux, lệnh trên tạo gói Debian `.deb` tại `src-tauri/target/release/bundle/deb/`. Bản release bật tối ưu kích thước và strip symbol debug.

Build script gộp `src/inject/css` và `src/inject/js` thành tài nguyên được nhúng vào ứng dụng. Thay đổi các tệp này sẽ được build.rs theo dõi.

## Tính năng

- Chế độ không animation, giảm hiệu ứng GPU, tối giản và thu gọn thanh bên.
- Zen mode, làm mờ nội dung riêng tư, và tự làm mờ khi cửa sổ mất focus.
- Giao diện OLED/Slate, trình xem ảnh, và phím tắt `Ctrl/Cmd + ,`, `K`, `B`, `Shift + F`, `Shift + M`, `Shift + R` và `1–9`.
- Biểu tượng khay hệ thống; nút đóng cửa sổ sẽ ẩn ứng dụng.
- Một số URL có dấu hiệu theo dõi bị chặn trong quá trình điều hướng.

## Ghi chú

Đây là ứng dụng không chính thức, không dùng Facebook API và không trích xuất cookie hay thông tin đăng nhập. Đăng nhập trực tiếp trong cửa sổ Messenger; khả năng sử dụng phụ thuộc vào chính sách và thay đổi giao diện của Meta. Tùy chọn chặn điều hướng có thể ảnh hưởng đến một số chức năng của Messenger.

Nếu cần thay biểu tượng, tạo một ảnh PNG vuông rồi chạy:

```bash
npx tauri icon path/to/your-app-icon.png
```
