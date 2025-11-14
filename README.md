# Chợ Tốt Tracker

Hệ thống tự động theo dõi và thông báo tin rao hàng mới trên Chợ Tốt (chotot.com) theo tiêu chí bạn đặt ra.

## Tính năng

- 🔍 Tự động scrape tin rao từ Chợ Tốt theo danh mục và khu vực
- 💰 Lọc theo khoảng giá (min/max)
- 🔑 Lọc theo từ khóa (keywords) - chỉ thông báo tin có chứa từ khóa
- 📸 Tạo snapshot ban đầu của các tin rao hiện có
- 🔔 Tự động kiểm tra tin rao mới theo interval
- 📧 Gửi email thông báo khi có tin rao mới phù hợp
- 🖼️ Email HTML đẹp mắt với hình ảnh và thông tin chi tiết

## Yêu cầu

- Node.js >= 16
- npm hoặc yarn
- Gmail account (để gửi email thông báo)

## Cài đặt

1. Clone hoặc tải dự án về
2. Cài đặt dependencies:

```bash
npm install
```

3. Cài đặt Playwright browsers:

```bash
npx playwright install chromium
```

## Cấu hình

1. Copy file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

2. Chỉnh sửa file `.env` với thông tin của bạn:

```env
# Cấu hình Chợ Tốt
CATEGORY_URL=https://www.chotot.com/tp-ho-chi-minh/mua-ban-nha-dat
REGION=tp-ho-chi-minh
MIN_PRICE=500000000
MAX_PRICE=2000000000

# Từ khóa lọc (cách nhau bởi dấu phẩy, để trống để bỏ qua)
# Ví dụ: iphone 14,iphone 15,samsung s23
KEYWORDS=

# Cấu hình kiểm tra (milliseconds)
CHECK_INTERVAL=300000

# Cấu hình Email
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
NOTIFY_EMAIL=recipient@gmail.com

# Cấu hình Browser
HEADLESS=true
```

### Lấy App Password cho Gmail

1. Truy cập [Google Account Security](https://myaccount.google.com/security)
2. Bật "2-Step Verification" nếu chưa bật
3. Vào "App passwords"
4. Tạo app password mới và copy vào `EMAIL_PASSWORD`

### Tìm Category URL

1. Truy cập [chotot.com](https://www.chotot.com)
2. Chọn danh mục bạn muốn theo dõi (ví dụ: Nhà đất, Xe cộ, Đồ điện tử...)
3. Chọn khu vực
4. Copy URL từ thanh địa chỉ và paste vào `CATEGORY_URL`

### Sử dụng Keywords

- **Để trống** (`KEYWORDS=`): Hệ thống sẽ theo dõi tất cả tin rao trong khoảng giá
- **Có từ khóa** (`KEYWORDS=iphone 14,iphone 15`): Chỉ theo dõi tin có chứa ít nhất một trong các từ khóa
- Từ khóa **không phân biệt hoa thường**
- Nhiều từ khóa cách nhau bởi dấu phẩy (`,`)
- Ví dụ:
  - `KEYWORDS=iphone 13,iphone 14,iphone 15` - chỉ theo dõi iPhone 13, 14, 15
  - `KEYWORDS=galaxy s23,galaxy s24` - chỉ theo dõi Samsung Galaxy S23, S24
  - `KEYWORDS=macbook pro,macbook air` - chỉ theo dõi MacBook Pro và Air

## Chạy chương trình

### Development mode:

```bash
npm run dev
```

### Production mode:

```bash
npm run build
npm start
```

## Cách hoạt động

1. **Khởi động**: Khi chạy lần đầu, hệ thống sẽ:
   - Load cấu hình từ `.env`
   - Kiểm tra kết nối email
   - Mở trình duyệt và scrape các tin rao hiện tại
   - Lưu snapshot vào thư mục `data/`

2. **Monitoring**: Sau mỗi khoảng thời gian `CHECK_INTERVAL`:
   - Scrape lại tin rao mới nhất
   - So sánh với snapshot trước đó
   - Nếu phát hiện tin rao mới trong khoảng giá:
     - Gửi email thông báo
     - Cập nhật snapshot
     - Log ra console

3. **Email thông báo** sẽ bao gồm:
   - Tiêu đề tin rao
   - Giá (định dạng Việt Nam)
   - Hình ảnh
   - Vị trí
   - Link xem chi tiết

## Cấu trúc dự án

```
playwright-chotot/
├── src/
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── utils/
│   │   ├── config.ts         # Load cấu hình từ .env
│   │   └── storage.ts        # Quản lý snapshot
│   ├── services/
│   │   ├── scraper.ts        # Playwright scraper
│   │   └── emailService.ts   # Gửi email
│   └── index.ts              # Entry point
├── data/                     # Snapshot storage (auto-generated)
├── .env                      # Cấu hình (cần tạo)
├── .env.example              # Mẫu cấu hình
├── package.json
└── tsconfig.json
```

## Lưu ý

- **Selectors**: Cấu trúc HTML của Chợ Tốt có thể thay đổi. Nếu không scrape được, cần điều chỉnh selectors trong [scraper.ts](src/services/scraper.ts)
- **Rate limiting**: Không nên đặt `CHECK_INTERVAL` quá thấp để tránh bị chặn
- **Headless mode**: Đặt `HEADLESS=false` để xem trình duyệt hoạt động (debug)
- **Data folder**: Thư mục `data/` sẽ tự động tạo khi chạy lần đầu

## Debugging

Nếu gặp vấn đề:

1. Đặt `HEADLESS=false` để xem trình duyệt
2. Kiểm tra console logs
3. Xem file snapshot tại `data/snapshot.json`
4. Kiểm tra selectors có đúng với cấu trúc HTML hiện tại không

## License

MIT
