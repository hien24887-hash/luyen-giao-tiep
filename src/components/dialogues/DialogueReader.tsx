import { useState } from "react";
import type { DialogueTopic } from "../../data/dialogues";
import type { WordMatchResult } from "../../lib/matchWords";
import { isSpeechRecognitionSupported, speak } from "../../lib/speech";
import { awardStars, recordTopicScore, type AwardResult } from "../../lib/progress";
import { buildDialogueHtml, dialogueFilename, downloadHtmlFile } from "../../lib/exportDialogue";
import Mascot from "../mascot/Mascot";
import RewardPopup from "../mascot/RewardPopup";
import DialogueLineCard from "./DialogueLineCard";

interface DialogueReaderProps {
  dialogue: DialogueTopic;
}

// Hoàn thành 1 bài hội thoại (15 câu, mỗi câu đọc riêng) được tính công tương
// đương hoàn thành 1 chủ đề giao tiếp (10 mẫu câu) trong app.
const STARS_PER_DIALOGUE = 8;

export default function DialogueReader({ dialogue }: DialogueReaderProps) {
  const micSupported = isSpeechRecognitionSupported();
  const [resultsByLine, setResultsByLine] = useState<(WordMatchResult[] | null)[]>(() =>
    dialogue.lines.map(() => null)
  );
  const [finished, setFinished] = useState(false);
  const [rewardPopup, setRewardPopup] = useState<AwardResult | null>(null);

  function handleResult(lineIdx: number, result: WordMatchResult[] | null) {
    setResultsByLine((prev) => {
      const next = [...prev];
      next[lineIdx] = result;
      return next;
    });
  }

  function handleListenAll() {
    speak(dialogue.lines.map((l) => l.text).join(". "));
  }

  function handleDownload() {
    downloadHtmlFile(dialogueFilename(dialogue), buildDialogueHtml(dialogue));
  }

  const attemptedCount = resultsByLine.filter(Boolean).length;
  const allAttempted = attemptedCount === dialogue.lines.length;
  const totalWords = resultsByLine.reduce((sum, r) => sum + (r?.length ?? 0), 0);
  const correctWords = resultsByLine.reduce(
    (sum, r) => sum + (r?.filter((x) => x.status === "correct").length ?? 0),
    0
  );

  function handleFinish() {
    recordTopicScore(`dialogue-${dialogue.id}`, correctWords, totalWords);
    const result = awardStars(STARS_PER_DIALOGUE);
    if (result.newTrophies > 0 || result.newMoneyVnd > 0) setRewardPopup(result);
    setFinished(true);
  }

  function handleRestart() {
    setResultsByLine(dialogue.lines.map(() => null));
    setFinished(false);
  }

  if (finished) {
    return (
      <div className="story-reader">
        <div className="mascot-row">
          <Mascot pose="cheer" size={90} />
        </div>
        <h3>🎉 Hoàn thành hội thoại "{dialogue.title}"!</h3>
        <p className="final-score">
          Đọc đúng {correctWords}/{totalWords} từ — <span className="star-gain">+{STARS_PER_DIALOGUE} ⭐</span>
        </p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={handleRestart}>
            Luyện lại từ đầu
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
    <div className="story-reader" style={{ "--rule-color": dialogue.color } as React.CSSProperties}>
      <div className="btn-row" style={{ justifyContent: "center", marginBottom: "1rem" }}>
        <button type="button" className="btn btn-ghost" onClick={handleListenAll}>
          🔊 Nghe cả bài hội thoại
        </button>
        <button type="button" className="btn btn-ghost" onClick={handleDownload}>
          📥 Tải xuống bài này
        </button>
      </div>

      <p className="score-line">
        Đã luyện {attemptedCount}/{dialogue.lines.length} câu
      </p>

      {!micSupported && (
        <p className="unsupported-note">
          ⚠️ Trình duyệt này không hỗ trợ nhận diện giọng nói. Con vẫn có thể bấm "🔊" để luyện nghe — hãy thử mở
          trang bằng Google Chrome để dùng được phần chấm đọc.
        </p>
      )}

      <div className="dialogue-passage">
        {dialogue.lines.map((line, idx) => (
          <DialogueLineCard
            key={idx}
            line={line}
            color={dialogue.color}
            result={resultsByLine[idx]}
            onResult={(r) => handleResult(idx, r)}
          />
        ))}
      </div>

      <div className="btn-row" style={{ justifyContent: "center", marginTop: "1rem" }}>
        <button type="button" className="btn btn-primary" onClick={handleFinish} disabled={!allAttempted}>
          {allAttempted ? "Hoàn thành 🏁" : `Hãy đọc hết ${dialogue.lines.length} câu để hoàn thành`}
        </button>
      </div>
    </div>
  );
}
