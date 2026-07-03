import { useState } from "react";
import { communicationTopics, type CommTopic } from "./data/communication";
import { useRewards } from "./lib/useRewards";
import Mascot from "./components/mascot/Mascot";
import SpeechBubble from "./components/mascot/SpeechBubble";
import TopicPractice from "./components/communicate/TopicPractice";

export default function App() {
  const [selected, setSelected] = useState<CommTopic | null>(null);
  const rewards = useRewards();

  const greeting =
    rewards.totalStars === 0
      ? "Chào con! Chọn 1 chủ đề bên dưới, nghe câu hỏi rồi tập trả lời nhé!"
      : `Con đã có ${rewards.totalStars} ⭐ và ${rewards.totalTrophies} 🏆 rồi! Luyện thêm chủ đề nữa nào!`;

  return (
    <div className="app-shell">
      <nav className="navbar">
        <span className="nav-brand">💬 Luyện Giao Tiếp Tiếng Anh</span>
        <div className="reward-badge">
          <span>⭐ {rewards.totalStars}</span>
          <span>🏆 {rewards.totalTrophies}</span>
        </div>
      </nav>

      <header className="page-banner">
        <h1>Luyện giao tiếp hàng ngày</h1>
        <p>Mỗi chủ đề là 1 tình huống thật — nghe câu hỏi, trả lời theo mẫu câu, app nghe và sửa lỗi phát âm ngay tại chỗ.</p>
      </header>

      <main className="page-content">
        {!selected ? (
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
                  onClick={() => setSelected(topic)}
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
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
                ← Chọn chủ đề khác
              </button>
            </div>
            <TopicPractice key={selected.id} topic={selected} />
          </div>
        )}
      </main>
    </div>
  );
}
