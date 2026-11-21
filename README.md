# bimbimbambam

Giao diện chat đa nền tảng, gọn nhẹ, không framework và hỗ trợ lưu dữ liệu trong trình duyệt.

## Chạy

Mở `index.html` bằng trình duyệt hiện đại, hoặc chạy:

```bash
python3 -m http.server 4173
```

Sau đó truy cập `http://localhost:4173`.

## Tính năng hiện có

- Giao diện sáng/tối, responsive desktop và mobile.
- Tìm kiếm, lọc tất cả/chưa đọc/nhóm, đổi thứ tự.
- Gửi tin nhắn và đính kèm tên tệp; lưu hội thoại bằng `localStorage`.
- Phím tắt `Ctrl/Cmd + K`.
- Hỗ trợ `prefers-reduced-motion`.

## Kết nối dịch vụ thật

Đây là giao diện client. Messenger/Facebook không cho phép nhúng chính thức các tài khoản cá nhân mà không tuân thủ nền tảng Meta và quy trình OAuth. Tích hợp thực tế cần:

1. Meta Developer App và quyền `pages_messaging` hoặc API được cấp phép.
2. Backend OAuth, xác thực App Secret và Access Token.
3. Webhook nhận tin nhắn; không lưu token trong JavaScript.
4. Kết nối WebSocket/WebRTC hoặc dịch vụ chat của bạn để đổi tin nhắn thời gian thực.

Không nên dùng cookie, giả lập đăng nhập hoặc tiện ích can thiệp vào Facebook/Messenger.
