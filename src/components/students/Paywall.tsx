import { logOut, TRIAL_DAYS } from "../../lib/progress";
import NavBrand from "../layout/NavBrand";

// Thông tin chuyển khoản TPBank — dùng dịch vụ ảnh QR công khai của VietQR
// (img.vietqr.io), không cần server riêng để tạo mã QR.
const BANK_ID = "970423"; // TPBank
const ACCOUNT_NO = "06784973301";
const ACCOUNT_NAME = "TRAN THI HIEN";
const AMOUNT_VND = 200000;
const ZALO_CONTACT = "0329225486";

interface PaywallProps {
  studentId: string;
  studentName: string;
}

export default function Paywall({ studentId, studentName }: PaywallProps) {
  const code = studentId.slice(0, 8).toUpperCase();
  const addInfo = `MOKHOA ${code}`;
  const qrUrl =
    `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png` +
    `?amount=${AMOUNT_VND}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  return (
    <div className="app-shell">
      <nav className="navbar">
        <NavBrand />
        <button type="button" className="btn btn-ghost btn-small" onClick={() => logOut()}>
          🚪 Đăng xuất
        </button>
      </nav>

      <header className="page-banner">
        <h1>Đã hết thời gian dùng thử</h1>
        <p>
          {studentName} đã dùng thử miễn phí {TRIAL_DAYS} ngày. Chuyển khoản 1 lần để tiếp tục học trọn đời nhé!
        </p>
      </header>

      <main className="page-content">
        <div className="paywall-card">
          <img src={qrUrl} alt="Mã QR chuyển khoản TPBank" className="paywall-card__qr" />
          <div className="paywall-card__info">
            <p>
              <strong>Ngân hàng:</strong> TPBank
            </p>
            <p>
              <strong>Chủ tài khoản:</strong> {ACCOUNT_NAME}
            </p>
            <p>
              <strong>Số tài khoản:</strong> 0678 4973 301
            </p>
            <p>
              <strong>Số tiền:</strong> {AMOUNT_VND.toLocaleString("vi-VN")}đ (thanh toán 1 lần, dùng trọn đời)
            </p>
            <p>
              <strong>Nội dung chuyển khoản:</strong> <span className="paywall-card__code">{addInfo}</span>
            </p>
            <p className="paywall-card__note">
              Sau khi chuyển khoản xong, bạn add Zalo{" "}
              <span className="paywall-card__code">{ZALO_CONTACT}</span> để được kích hoạt, và vào nhóm cập nhật
              thêm tài liệu.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
