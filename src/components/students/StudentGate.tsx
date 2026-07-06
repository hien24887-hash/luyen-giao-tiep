import { useState, type FormEvent } from "react";
import { logIn, signUp, translateAuthError } from "../../lib/progress";
import Mascot from "../mascot/Mascot";

type Mode = "login" | "signup";

export default function StudentGate() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(name, email, password);
      } else {
        await logIn(email, password);
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <span className="nav-brand">💬 Luyện Giao Tiếp Tiếng Anh</span>
      </nav>

      <header className="page-banner">
        <h1>{mode === "login" ? "Đăng nhập để luyện tập" : "Tạo tài khoản học viên"}</h1>
        <p>Mỗi học viên có 1 tài khoản riêng để theo dõi đúng tiến độ của mình, đăng nhập được từ mọi thiết bị.</p>
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

          {error && <p className="auth-form__error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
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
          ) : (
            <>
              Đã có tài khoản?{" "}
              <button type="button" className="link-button" onClick={() => switchMode("login")}>
                Đăng nhập
              </button>
            </>
          )}
        </p>
      </main>
    </div>
  );
}
