import { useState, type FormEvent } from "react";
import { logIn, resetPassword, signUp, translateAuthError } from "../../lib/progress";
import Mascot from "../mascot/Mascot";

type Mode = "login" | "signup" | "forgot";

export default function StudentGate() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(name, email, password);
      } else if (mode === "forgot") {
        await resetPassword(email);
        setInfo("Đã gửi email hướng dẫn đặt lại mật khẩu — vui lòng kiểm tra hộp thư (kể cả mục spam).");
      } else {
        await logIn(email, password);
      }
    } catch (err) {
      if (mode === "forgot") {
        const code = (err as { code?: string } | null)?.code;
        setError(
          code === "auth/user-not-found" || code === "auth/invalid-email"
            ? "Không tìm thấy tài khoản với email này."
            : translateAuthError(err)
        );
      } else {
        setError(translateAuthError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    mode === "login" ? "Đăng nhập để luyện tập" : mode === "signup" ? "Tạo tài khoản học viên" : "Quên mật khẩu";
  const subtitle =
    mode === "forgot"
      ? "Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
      : "Mỗi học viên có 1 tài khoản riêng để theo dõi đúng tiến độ của mình, đăng nhập được từ mọi thiết bị.";

  return (
    <div className="app-shell">
      <nav className="navbar">
        <span className="nav-brand">💬 Luyện Giao Tiếp Tiếng Anh</span>
      </nav>

      <header className="page-banner">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>

      <main className="page-content">
        <div className="mascot-row">
          <Mascot pose="idle" size={100} />
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              className="answer-input auth-form__input"
              placeholder="Tên học viên (ví dụ: Bé An)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              required
            />
          )}
          <input
            className="answer-input auth-form__input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          {mode !== "forgot" && (
            <input
              className="answer-input auth-form__input"
              type="password"
              placeholder="Mật khẩu (ít nhất 6 ký tự)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
            />
          )}

          {mode === "login" && (
            <button type="button" className="link-button auth-form__forgot" onClick={() => switchMode("forgot")}>
              Quên mật khẩu?
            </button>
          )}

          {error && <p className="auth-form__error">{error}</p>}
          {info && <p className="auth-form__info">{info}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? "Đang xử lý..."
              : mode === "login"
                ? "Đăng nhập"
                : mode === "signup"
                  ? "Tạo tài khoản"
                  : "Gửi email đặt lại mật khẩu"}
          </button>
        </form>

        <p className="auth-form__switch">
          {mode === "login" ? (
            <>
              Chưa có tài khoản?{" "}
              <button type="button" className="link-button" onClick={() => switchMode("signup")}>
                Tạo tài khoản mới
              </button>
            </>
          ) : mode === "signup" ? (
            <>
              Đã có tài khoản?{" "}
              <button type="button" className="link-button" onClick={() => switchMode("login")}>
                Đăng nhập
              </button>
            </>
          ) : (
            <button type="button" className="link-button" onClick={() => switchMode("login")}>
              ← Quay lại đăng nhập
            </button>
          )}
        </p>
      </main>
    </div>
  );
}
