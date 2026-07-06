import { useEffect, useState } from "react";
import { fetchAllStudentSummaries, fetchOwnSummary, isAdmin, markStudentPaid, type StudentSummary } from "../../lib/progress";
import { communicationTopics } from "../../data/communication";
import { dialogueTopics } from "../../data/dialogues";

interface StudentDashboardProps {
  onClose: () => void;
}

function formatLastActive(iso: string | null): string {
  if (!iso) return "Chưa luyện bài nào";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function accessLabel(access: StudentSummary["access"]): string {
  if (access.paid) return "✅ Đã thanh toán";
  if (access.trialExpired) return "🔒 Hết hạn dùng thử";
  return `⏳ Còn ${access.daysLeft} ngày`;
}

export default function StudentDashboard({ onClose }: StudentDashboardProps) {
  const [summaries, setSummaries] = useState<StudentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const admin = isAdmin();

  function loadSummaries() {
    const request = admin ? fetchAllStudentSummaries() : fetchOwnSummary().then((own) => (own ? [own] : []));
    request
      .then((result) => setSummaries(result))
      .catch(() => setError("Không tải được dữ liệu học viên, vui lòng thử lại."));
  }

  useEffect(() => {
    loadSummaries();
  }, []);

  async function handleUnlock(studentId: string) {
    setUnlockingId(studentId);
    try {
      await markStudentPaid(studentId);
      loadSummaries();
    } catch {
      setError("Không mở khóa được, vui lòng thử lại.");
    } finally {
      setUnlockingId(null);
    }
  }

  return (
    <div>
      <div className="btn-row" style={{ marginBottom: "1rem" }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          ← Quay lại luyện tập
        </button>
      </div>

      <h2 className="section-title">{admin ? "📊 Theo dõi học viên" : "📊 Tiến độ của tôi"}</h2>

      {error ? (
        <p>{error}</p>
      ) : !summaries ? (
        <p>Đang tải...</p>
      ) : summaries.length === 0 ? (
        <p>Chưa có dữ liệu.</p>
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
                {admin && <th>Trạng thái</th>}
              </tr>
            </thead>
            <tbody>
              {summaries.map(
                ({ student, totalStars, totalTrophies, totalMoneyVnd, topicsCompleted, dialoguesCompleted, lastActive, access }) => (
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
                    {admin && (
                      <td>
                        <div className="student-table__access">
                          <span>{accessLabel(access)}</span>
                          {!access.paid && (
                            <button
                              type="button"
                              className="btn btn-primary btn-small"
                              disabled={unlockingId === student.id}
                              onClick={() => handleUnlock(student.id)}
                            >
                              {unlockingId === student.id ? "Đang mở..." : "Xác nhận đã thanh toán"}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
