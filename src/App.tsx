import { useState } from "react";
import { communicationTopics, type CommTopic } from "./data/communication";
import { dialogueTopics, type DialogueTopic } from "./data/dialogues";
import { useRewards } from "./lib/useRewards";
import { useCurrentStudent } from "./lib/useCurrentStudent";
import { logOut } from "./lib/progress";
import { buildAllDialoguesHtml, downloadHtmlFile } from "./lib/exportDialogue";
import Mascot from "./components/mascot/Mascot";
import SpeechBubble from "./components/mascot/SpeechBubble";
import TopicPractice from "./components/communicate/TopicPractice";
import DialogueReader from "./components/dialogues/DialogueReader";
import StudentGate from "./components/students/StudentGate";
import StudentDashboard from "./components/students/StudentDashboard";

type Section = "patterns" | "dialogues";
type View = "practice" | "dashboard";

export default function App() {
  const { student: currentStudent, loading: authLoading } = useCurrentStudent();
  const [view, setView] = useState<View>("practice");
  const [section, setSection] = useState<Section>("patterns");
  const [selectedTopic, setSelectedTopic] = useState<CommTopic | null>(null);
  const [selectedDialogue, setSelectedDialogue] = useState<DialogueTopic | null>(null);
  const rewards = useRewards();

  if (authLoading) {
    return (
      <div className="app-shell">
        <nav className="navbar">
          <span className="nav-brand">💬 Luyện Giao Tiếp Tiếng Anh</span>
        </nav>
        <main className="page-content">
          <p style={{ textAlign: "center", marginTop: "3rem" }}>Đang tải...</p>
        </main>
      </div>
    );
  }

  if (!currentStudent) {
    return <StudentGate />;
  }

  const greeting =
    rewards.totalStars === 0
      ? `Chào ${currentStudent.name}! Chọn 1 chủ đề bên dưới, nghe câu hỏi rồi tập trả lời nhé!`
      : `${currentStudent.name} đã có ${rewards.totalStars} ⭐ và ${rewards.totalTrophies} 🏆 rồi! Luyện thêm chủ đề nữa nào!`;

  function handleSelectSection(next: Section) {
    setSection(next);
    setSelectedTopic(null);
    setSelectedDialogue(null);
  }

  function handleDownloadAllDialogues() {
    downloadHtmlFile("hoi-thoai-tat-ca.html", buildAllDialoguesHtml(dialogueTopics));
  }

  const showingDetail = section === "patterns" ? Boolean(selectedTopic) : Boolean(selectedDialogue);

  if (view === "dashboard") {
    return (
      <div className="app-shell">
        <nav className="navbar">
          <span className="nav-brand">💬 Luyện Giao Tiếp Tiếng Anh</span>
          <div className="reward-badge">
            <span>👤 {currentStudent.name}</span>
          </div>
        </nav>
        <header className="page-banner">
          <h1>Theo dõi học viên</h1>
          <p>Xem tổng quan sao, cúp, thưởng và tiến độ của từng học viên.</p>
        </header>
        <main className="page-content">
          <StudentDashboard onClose={() => setView("practice")} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <span className="nav-brand">💬 Luyện Giao Tiếp Tiếng Anh</span>
        <div className="navbar-actions">
          <div className="reward-badge">
            <span>👤 {currentStudent.name}</span>
            <span>⭐ {rewards.totalStars}</span>
            <span>🏆 {rewards.totalTrophies}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setView("dashboard")}>
            📊 Theo dõi
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => logOut()}>
            🚪 Đăng xuất
          </button>
        </div>
      </nav>

      <header className="page-banner">
        <h1>Luyện giao tiếp hàng ngày</h1>
        <p>
          {section === "patterns"
            ? "Mỗi chủ đề là 1 tình huống thật — nghe câu hỏi, trả lời theo mẫu câu, app nghe và sửa lỗi phát âm ngay tại chỗ."
            : "Mỗi bài là 1 đoạn hội thoại tự nhiên — nghe cả bài, đọc theo từng câu, app sửa lỗi phát âm ngay tại chỗ."}
        </p>
      </header>

      <main className="page-content">
        {!showingDetail && (
          <div className="section-tabs">
            <button
              type="button"
              className={"section-tab" + (section === "patterns" ? " active" : "")}
              onClick={() => handleSelectSection("patterns")}
            >
              🗂️ Mẫu câu giao tiếp
            </button>
            <button
              type="button"
              className={"section-tab" + (section === "dialogues" ? " active" : "")}
              onClick={() => handleSelectSection("dialogues")}
            >
              💭 Hội thoại
            </button>
          </div>
        )}

        {section === "patterns" ? (
          !selectedTopic ? (
            <>
              <div className="mascot-row">
                <Mascot pose={rewards.totalStars > 0 ? "cheer" : "idle"} size={90} />
                <SpeechBubble>{greeting}</SpeechBubble>
              </div>

              <div className="topic-grid">
                {communicationTopics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    className="topic-card"
                    style={{ "--rule-color": topic.color } as React.CSSProperties}
                    onClick={() => setSelectedTopic(topic)}
                  >
                    <span className="topic-card__icon">{topic.icon}</span>
                    <span className="topic-card__title">{topic.title}</span>
                    <span className="topic-card__title-vi">{topic.titleVi}</span>
                    <span className="topic-card__pattern">{topic.pattern}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div>
              <div className="btn-row" style={{ marginBottom: "1rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setSelectedTopic(null)}>
                  ← Chọn chủ đề khác
                </button>
              </div>
              <TopicPractice key={selectedTopic.id} topic={selectedTopic} />
            </div>
          )
        ) : !selectedDialogue ? (
          <>
            <div className="mascot-row">
              <Mascot pose={rewards.totalStars > 0 ? "cheer" : "idle"} size={90} />
              <SpeechBubble>Chọn 1 bài hội thoại để nghe cả bài rồi đọc theo từng câu nhé!</SpeechBubble>
            </div>

            <div className="btn-row" style={{ justifyContent: "center", marginBottom: "1.4rem" }}>
              <button type="button" className="btn btn-primary" onClick={handleDownloadAllDialogues}>
                📥 Tải xuống tất cả {dialogueTopics.length} bài hội thoại
              </button>
            </div>

            <div className="topic-grid">
              {dialogueTopics.map((dialogue) => (
                <button
                  key={dialogue.id}
                  type="button"
                  className="topic-card"
                  style={{ "--rule-color": dialogue.color } as React.CSSProperties}
                  onClick={() => setSelectedDialogue(dialogue)}
                >
                  <span className="topic-card__icon">{dialogue.icon}</span>
                  <span className="topic-card__title">{dialogue.title}</span>
                  <span className="topic-card__title-vi">{dialogue.titleVi}</span>
                  <span className="topic-card__pattern">{dialogue.lines.length} câu</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <div className="btn-row" style={{ marginBottom: "1rem" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setSelectedDialogue(null)}>
                ← Chọn bài hội thoại khác
              </button>
            </div>
            <DialogueReader key={selectedDialogue.id} dialogue={selectedDialogue} />
          </div>
        )}
      </main>
    </div>
  );
}
