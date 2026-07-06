import { getAllStudentSummaries } from "../../lib/progress";
import { communicationTopics } from "../../data/communication";
import { dialogueTopics } from "../../data/dialogues";

interface StudentDashboardProps {
  onClose: () => void;
}

function formatLastActive(iso: string | null): string {
  if (!iso) return "Chưa luyện bài nào";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function StudentDashboard({ onClose }: StudentDashboardProps) {
  const summaries = getAllStudentSummaries();

  return (
    <div>
      <div className="btn-row" style={{ marginBottom: "1rem" }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          ← Quay lại luyện tập
        </button>
      </div>

      <h2 className="section-title">📊 Theo dõi học viên</h2>

      {summaries.length === 0 ? (
        <p>Chưa có hồ sơ học viên nào.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="student-table">
            <thead>
              <tr>
                <th>Học viên</th>
                <th>⭐ Sao</th>
                <th>🏆 Cúp</th>
                <th>💰 Thưởng</th>
                <th>🗂️ Chủ đề</th>
                <th>💭 Hội thoại</th>
                <th>Học gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map(
                ({ student, totalStars, totalTrophies, totalMoneyVnd, topicsCompleted, dialoguesCompleted, lastActive }) => (
                  <tr key={student.id}>
                    <td className="student-table__name">{student.name}</td>
                    <td>{totalStars}</td>
                    <td>{totalTrophies}</td>
                    <td>{totalMoneyVnd.toLocaleString("vi-VN")}đ</td>
                    <td>
                      {topicsCompleted}/{communicationTopics.length}
                    </td>
                    <td>
                      {dialoguesCompleted}/{dialogueTopics.length}
                    </td>
                    <td>{formatLastActive(lastActive)}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
