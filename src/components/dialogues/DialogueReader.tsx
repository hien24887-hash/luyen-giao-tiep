import { useEffect, useMemo, useRef, useState } from "react";
import type { DialogueTopic } from "../../data/dialogues";
import { alignTranscript, type WordMatchResult } from "../../lib/matchWords";
import { isSpeechRecognitionSupported, speak, startRecognition, type RecognitionHandle } from "../../lib/speech";
import { awardStars, recordTopicScore, type AwardResult } from "../../lib/progress";
import Mascot from "../mascot/Mascot";
import RewardPopup from "../mascot/RewardPopup";
import WordChip, { type ChipStatus } from "../reading/WordChip";
import MicButton from "../reading/MicButton";

interface DialogueReaderProps {
  dialogue: DialogueTopic;
}

interface LineToken {
  text: string;
  punct?: string;
}

function tokenizeLine(text: string): LineToken[] {
  return text.split(" ").map((raw) => {
    const match = raw.match(/^([A-Za-z']+)([.,!?]?)$/);
    if (!match) return { text: raw };
    return { text: match[1], punct: match[2] || undefined };
  });
}

const STARS_PER_DIALOGUE = 8;

export default function DialogueReader({ dialogue }: DialogueReaderProps) {
  const micSupported = useMemo(() => isSpeechRecognitionSupported(), []);
  const [lineIdx, setLineIdx] = useState(0);
  const [resultsByLine, setResultsByLine] = useState<(WordMatchResult[] | null)[]>(() =>
    dialogue.lines.map(() => null)
  );
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finished, setFinished] = useState(false);
  const [rewardPopup, setRewardPopup] = useState<AwardResult | null>(null);
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const transcriptRef = useRef("");
  const finalizedRef = useRef(false);
  const lineIdxRef = useRef(lineIdx);
  lineIdxRef.current = lineIdx;

  const currentLine = dialogue.lines[lineIdx];
  const tokens = useMemo(() => tokenizeLine(currentLine.text), [currentLine.text]);
  const currentResults = resultsByLine[lineIdx];

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function statusFor(idx: number): ChipStatus {
    const found = currentResults?.find((r) => r.index === idx);
    return found ? found.status : "neutral";
  }

  function finalizeLine(transcript: string) {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    const targetIdx = lineIdxRef.current;
    const expectedWords = tokenizeLine(dialogue.lines[targetIdx].text).map((t) => t.text);
    const heardWords = transcript.split(/\s+/).filter(Boolean);
    const results = alignTranscript(expectedWords, heardWords);
    setResultsByLine((prev) => {
      const next = [...prev];
      next[targetIdx] = results;
      return next;
    });
  }

  function beginRecording() {
    if (!micSupported) return;
    transcriptRef.current = "";
    finalizedRef.current = false;
    setLiveTranscript("");
    setIsRecording(true);

    recognitionRef.current = startRecognition({
      continuous: true,
      onResult: (transcript) => {
        transcriptRef.current = transcript;
        setLiveTranscript(transcript);
      },
      onEnd: () => {
        setIsRecording(false);
        finalizeLine(transcriptRef.current);
      },
      onError: () => {
        setIsRecording(false);
        finalizeLine(transcriptRef.current);
      },
    });
  }

  function handleToggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    beginRecording();
  }

  function handleRetryLine() {
    recognitionRef.current?.stop();
    setResultsByLine((prev) => {
      const next = [...prev];
      next[lineIdx] = null;
      return next;
    });
    setLiveTranscript("");
  }

  function handleWordClick(token: LineToken) {
    if (isRecording) return;
    speak(token.text);
  }

  function handleListenLine() {
    if (isRecording) return;
    speak(currentLine.text);
  }

  function handleListenWhole() {
    if (isRecording) return;
    speak(dialogue.lines.map((l) => l.text).join(". "));
  }

  function handleAdvance() {
    recognitionRef.current?.stop();
    if (lineIdx < dialogue.lines.length - 1) {
      setLineIdx((i) => i + 1);
      setLiveTranscript("");
      return;
    }
    const totalWords = dialogue.lines.reduce((sum, l) => sum + tokenizeLine(l.text).length, 0);
    const correctWords = resultsByLine.reduce(
      (sum, results) => sum + (results?.filter((r) => r.status === "correct").length ?? 0),
      0
    );
    recordTopicScore(`dialogue-${dialogue.id}`, correctWords, totalWords);
    const result = awardStars(STARS_PER_DIALOGUE);
    if (result.newTrophies > 0 || result.newMoneyVnd > 0) setRewardPopup(result);
    setFinished(true);
  }

  function handleRestart() {
    recognitionRef.current?.stop();
    setLineIdx(0);
    setResultsByLine(dialogue.lines.map(() => null));
    setLiveTranscript("");
    setFinished(false);
  }

  if (finished) {
    const totalWords = dialogue.lines.reduce((sum, l) => sum + tokenizeLine(l.text).length, 0);
    const correctWords = resultsByLine.reduce(
      (sum, results) => sum + (results?.filter((r) => r.status === "correct").length ?? 0),
      0
    );
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

  const incorrectTokens: { token: LineToken; index: number }[] = currentResults
    ? currentResults.filter((r) => r.status === "incorrect").map((r) => ({ token: tokens[r.index], index: r.index }))
    : [];
  const correctCount = currentResults ? currentResults.length - incorrectTokens.length : 0;

  return (
    <div className="story-reader" style={{ "--rule-color": dialogue.color } as React.CSSProperties}>
      <div className="btn-row" style={{ justifyContent: "center", marginBottom: "1rem" }}>
        <button type="button" className="btn btn-ghost" onClick={handleListenWhole} disabled={isRecording}>
          🔊 Nghe cả bài hội thoại
        </button>
      </div>

      <p className="score-line">
        Câu {lineIdx + 1}/{dialogue.lines.length}
      </p>

      <div className="dialogue-turn">
        <span className="dialogue-turn__speaker" style={{ color: dialogue.color }}>
          {currentLine.speaker}
        </span>
        <div className="sentence-row">
          {tokens.map((token, idx) => (
            <WordChip
              key={idx}
              text={token.text + (token.punct ?? "")}
              status={statusFor(idx)}
              onClick={() => handleWordClick(token)}
            />
          ))}
        </div>
        <p className="dialogue-line__ipa">{currentLine.ipa}</p>
        <p className="dialogue-line__meaning">{currentLine.meaning}</p>
      </div>

      {!micSupported && (
        <p className="unsupported-note">
          ⚠️ Trình duyệt này không hỗ trợ nhận diện giọng nói. Con vẫn có thể bấm "Nghe mẫu" để luyện nghe — hãy
          thử mở trang bằng Google Chrome để dùng được phần chấm đọc.
        </p>
      )}

      {isRecording && (
        <p className="unsupported-note">
          🎙 Đang nghe, con cứ đọc từ từ... {liveTranscript}
          <br />
          Đọc xong thì bấm "Dừng đọc".
        </p>
      )}

      <div className="btn-row" style={{ marginTop: "1rem" }}>
        <button type="button" className="btn btn-ghost" onClick={handleListenLine} disabled={isRecording}>
          🔊 Nghe câu này
        </button>
        <MicButton recording={isRecording} supported={micSupported} onClick={handleToggleRecording} />
        {currentResults && (
          <button type="button" className="btn btn-ghost" onClick={handleRetryLine} disabled={isRecording}>
            🔁 Đọc lại câu này
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAdvance}
          disabled={!currentResults || isRecording}
        >
          {lineIdx < dialogue.lines.length - 1 ? "Câu tiếp theo →" : "Xem kết quả 🏁"}
        </button>
      </div>

      {currentResults && (
        <>
          <p className="score-line">
            Câu này: {correctCount}/{currentResults.length} từ đúng
          </p>
          {incorrectTokens.length === 0 ? (
            <div className="feedback-banner correct">🎉 Con đọc đúng hết cả câu này rồi!</div>
          ) : (
            <div className="error-tip-panel">
              <h4>📌 Sửa lỗi đọc — các từ cần luyện lại</h4>
              <ul className="error-tip-list">
                {incorrectTokens.map(({ token, index }) => (
                  <li key={index}>
                    <button
                      type="button"
                      className="chip chip-error"
                      onClick={() => speak(token.text)}
                      title="Nghe lại từ này"
                    >
                      🔊 {token.text}
                    </button>
                    <span>💡 Hãy nghe kỹ âm mẫu rồi đọc lại thật chậm, chú ý trọng âm của từ.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
