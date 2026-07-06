import { useState, type FormEvent } from "react";
import { createStudent, deleteStudent, getStudents, selectStudent, type Student } from "../../lib/progress";
import Mascot from "../mascot/Mascot";

export default function StudentGate() {
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const [name, setName] = useState("");

  function refresh() {
    setStudents(getStudents());
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createStudent(name);
    setName("");
  }

  function handleDelete(id: string, studentName: string) {
    const confirmed = window.confirm(`Xóa hồ sơ học viên "${studentName}"? Toàn bộ sao/tiến độ của bé sẽ mất.`);
    if (!confirmed) return;
    deleteStudent(id);
    refresh();
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <span className="nav-brand">💬 Luyện Giao Tiếp Tiếng Anh</span>
      </nav>

      <header className="page-banner">
        <h1>Ai đang học hôm nay?</h1>
        <p>Chọn hồ sơ học viên, hoặc tạo hồ sơ mới để bắt đầu theo dõi riêng tiến độ của bé.</p>
      </header>

      <main className="page-content">
        <div className="mascot-row">
          <Mascot pose="idle" size={100} />
        </div>

        {students.length > 0 && (
          <div className="student-grid">
            {students.map((s) => (
              <div key={s.id} className="student-card">
                <button type="button" className="student-card__select" onClick={() => selectStudent(s.id)}>
                  <span className="student-card__avatar">🧒</span>
                  <span className="student-card__name">{s.name}</span>
                </button>
                <button
                  type="button"
                  className="student-card__delete"
                  onClick={() => handleDelete(s.id, s.name)}
                  title="Xóa hồ sơ này"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        <form className="student-form" onSubmit={handleCreate}>
          <input
            className="answer-input student-form__input"
            placeholder="Nhập tên học viên mới..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            + Thêm học viên
          </button>
        </form>
      </main>
    </div>
  );
}
