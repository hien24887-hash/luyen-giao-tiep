import { useState } from "react";
import type { CommTopic } from "../../data/communication";
import type { WordMatchResult } from "../../lib/matchWords";
import { awardStars, recordTopicScore, type AwardResult } from "../../lib/progress";
import Mascot from "../mascot/Mascot";
import RewardPopup from "../mascot/RewardPopup";
import PatternHub from "./PatternHub";
import DialogueCard from "./DialogueCard";

interface TopicPracticeProps {
  topic: CommTopic;
}

// Hoàn thành 1 chủ đề giao tiếp (10 mẫu hội thoại) được tính công gần bằng 1
// bài đọc trọn vẹn — vì đây là 10 lượt nghe + nói có chấm điểm.
const STARS_PER_TOPIC = 8;

export default function TopicPractice({ topic }: TopicPracticeProps) {
  const [resultsByItem, setResultsByItem] = useState<(WordMatchResult[] | null)[]>(() => topic.items.map(() => null));
  const [rewardPopup, setRewardPopup] = useState<AwardResult | null>(null);
  const [completed, setCompleted] = useState(false);
  const [recordingItemIdx, setRecordingItemIdx] = useState<number | null>(null);

  const leftItems = topic.items.slice(0, 5);
  const rightItems = topic.items.slice(5, 10);

  function handleResult(itemIndex: number, result: WordMatchResult[] | null) {
    setResultsByItem((prev) => {
      const next = [...prev];
      next[itemIndex] = result;
      return next;
    });
  }

  const attemptedCount = resultsByItem.filter(Boolean).length;
  const allAttempted = attemptedCount === topic.items.length;
  const totalWords = resultsByItem.reduce((sum, r) => sum + (r?.length ?? 0), 0);
  const correctWords = resultsByItem.reduce(
    (sum, r) => sum + (r?.filter((x) => x.status === "correct").length ?? 0),
    0
  );

  function handleFinish() {
    recordTopicScore(topic.id, correctWords, totalWords);
    const result = awardStars(STARS_PER_TOPIC);
    if (result.newTrophies > 0 || result.newMoneyVnd > 0) setRewardPopup(result);
    setCompleted(true);
  }

  function handleRestart() {
    setResultsByItem(topic.items.map(() => null));
    setCompleted(false);
  }

  if (completed) {
    return (
      <div className="story-reader">
        <div className="mascot-row">
          <Mascot pose="cheer" size={90} />
        </div>
        <h3>🎉 Hoàn thành chủ đề "{topic.title}"!</h3>
        <p className="final-score">
          Trả lời đúng {correctWords}/{totalWords} từ — <span className="star-gain">+{STARS_PER_TOPIC} ⭐</span>
        </p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={handleRestart}>
            Luyện lại chủ đề này
          </button>
        </div>
        {rewardPopup && (
          <RewardPopup
            newTrophies={rewardPopup.newTrophies}
            newMoneyVnd={rewardPopup.newMoneyVnd}
            onClose={() => setRewardPopup(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="score-line">
        Đã luyện {attemptedCount}/{topic.items.length} mẫu câu
      </p>

      <div className="comm-topic-layout">
        <div className="comm-col comm-col-left">
          {leftItems.map((item, i) => (
            <DialogueCard
              key={item.id}
              item={item}
              index={i}
              color={topic.color}
              result={resultsByItem[i]}
              onResult={(r) => handleResult(i, r)}
              disabled={recordingItemIdx !== null && recordingItemIdx !== i}
              onRecordingChange={(recording) => setRecordingItemIdx(recording ? i : null)}
            />
          ))}
        </div>

        <PatternHub topic={topic} />

        <div className="comm-col comm-col-right">
          {rightItems.map((item, i) => {
            const itemIndex = i + 5;
            return (
              <DialogueCard
                key={item.id}
                item={item}
                index={itemIndex}
                color={topic.color}
                result={resultsByItem[itemIndex]}
                onResult={(r) => handleResult(itemIndex, r)}
                disabled={recordingItemIdx !== null && recordingItemIdx !== itemIndex}
                onRecordingChange={(recording) => setRecordingItemIdx(recording ? itemIndex : null)}
              />
            );
          })}
        </div>
      </div>

      <div className="btn-row" style={{ justifyContent: "center", marginTop: "1.4rem" }}>
        <button type="button" className="btn btn-primary" onClick={handleFinish} disabled={!allAttempted}>
          {allAttempted ? "Hoàn thành chủ đề 🏁" : `Hãy luyện hết ${topic.items.length} mẫu câu để hoàn thành`}
        </button>
      </div>
    </div>
  );
}
