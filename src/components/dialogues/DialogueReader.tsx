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

// Hoàn thành 1 bài hội thoại (15 câu, đọc cả bài) được tính công tương đương
// hoàn thành 1 chủ đề giao tiếp (10 mẫu câu) trong app.
const STARS_PER_DIALOGUE = 8;

export default function DialogueReader({ dialogue }: DialogueReaderProps) {
  const micSupported = useMemo(() => isSpeechRecognitionSupported(), []);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [results, setResults] = useState<WordMatchResult[] | null>(null);
  const [finished, setFinished] = useState(false);
  const [rewardPopup, setRewardPopup] = useState<AwardResult | null>(null);
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const transcriptRef = useRef("");
  const finalizedRef = useRef(false);

  const lineTokens = useMemo(() => dialogue.lines.map((l) => tokenizeLine(l.text)), [dialogue]);
  const flatWords = useMemo(() => lineTokens.flatMap((tokens) => tokens.map((t) => t.text)), [lineTokens]);
  const lineOffsets = useMemo(() => {
    let offset = 0;
    return lineTokens.map((tokens) => {
      const start = offset;
      offset += tokens.length;
      return start;
    });
  }, [lineTokens]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function statusFor(lineIdx: number, wordIdx: number): ChipStatus {
    if (!results) return "neutral";
    const flatIndex = lineOffsets[lineIdx] + wordIdx;
    const found = results.find((r) => r.index === flatIndex);
    return found ? found.status : "neutral";
  }

  function finalizeReading(transcript: string) {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    const heardWords = transcript.split(/\s+/).filter(Boolean);
    setResults(alignTranscript(flatWords, heardWords));
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
        finalizeReading(transcriptRef.current);
      },
      onError: () => {
        setIsRecording(false);
        finalizeReading(transcriptRef.current);
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

  function handleRetry() {
    recognitionRef.current?.stop();
    setResults(null);
    setLiveTranscript("");
  }

  function handleWordClick(token: LineToken) {
    if (isRecording) return;
    speak(token.text);
  }

  function handleListenLine(text: string) {
    if (isRecording) return;
    speak(text);
  }

  function handleListenAll() {
    if (isRecording) return;
    speak(dialogue.lines.map((l) => l.text).join(". "));
  }

  function handleFinish() {
    if (!results) return;
    const correctWords = results.filter((r) => r.status === "correct").length;
    recordTopicScore(`dialogue-${dialogue.id}`, correctWords, flatWords.length);
    const result = awardStars(STARS_PER_DIALOGUE);
    if (result.newTrophies > 0 || result.newMoneyVnd > 0) setRewardPopup(result);
    setFinished(true);
  }

  function handleRestart() {
    recognitionRef.current?.stop();
    setResults(null);
    setLiveTranscript("");
    setFinished(false);
  }

  if (finished && results) {
    const correctWords = results.filter((r) => r.status === "correct").length;
    return (
      <div className="story-reader">
        <div className="mascot-row">
          <Mascot pose="cheer" size={90} />
        </div>
        <h3>🎉 Hoàn thành hội thoại "{dialogue.title}"!</h3>
        <p className="final-score">
          Đọc đúng {correctWords}/{flatWords.length} từ — <span className="star-gain">+{STARS_PER_DIALOGUE} ⭐</span>
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

  const incorrectTokens: { token: LineToken; flatIndex: number }[] = results
    ? results
        .filter((r) => r.status === "incorrect")
        .map((r) => ({ token: lineTokens.flat()[r.index], flatIndex: r.index }))
    : [];
  const correctCount = results ? results.length - incorrectTokens.length : 0;

  return (
    <div className="story-reader" style={{ "--rule-color": dialogue.color } as React.CSSProperties}>
      <p className="score-line">
        Cả bài — {dialogue.lines.length} câu, {flatWords.length} từ
      </p>

      <div className="full-passage">
        {dialogue.lines.map((line, lineIdx) => (
          <div className="dialogue-turn" key={lineIdx}>
            <div className="dialogue-turn__header">
              <span className="dialogue-turn__speaker" style={{ color: dialogue.color }}>
                {line.speaker}
              </span>
              <button
                type="button"
                className="btn btn-ghost dialogue-turn__listen"
                onClick={() => handleListenLine(line.text)}
                disabled={isRecording}
                title="Nghe câu này"
              >
                🔊
              </button>
            </div>
            <div className="sentence-row">
              {lineTokens[lineIdx].map((token, wordIdx) => (
                <WordChip
                  key={wordIdx}
                  text={token.text + (token.punct ?? "")}
                  status={statusFor(lineIdx, wordIdx)}
                  onClick={() => handleWordClick(token)}
                />
              ))}
            </div>
            <p className="dialogue-line__ipa">{line.ipa}</p>
            <p className="dialogue-line__meaning">{line.meaning}</p>
          </div>
        ))}
      </div>

      {!micSupported && (
        <p className="unsupported-note">
          ⚠️ Trình duyệt này không hỗ trợ nhận diện giọng nói. Con vẫn có thể bấm "Nghe mẫu" để luyện nghe — hãy
          thử mở trang bằng Google Chrome để dùng được phần chấm đọc.
        </p>
      )}

      {isRecording && (
        <p className="unsupported-note">
          🎙 Đang nghe, con cứ đọc từ từ hết cả bài... {liveTranscript}
          <br />
          Đọc xong thì bấm "Dừng đọc".
        </p>
      )}

      <div className="btn-row" style={{ marginTop: "1rem" }}>
        <button type="button" className="btn btn-ghost" onClick={handleListenAll} disabled={isRecording}>
          🔊 Nghe cả bài hội thoại
        </button>
        <MicButton recording={isRecording} supported={micSupported} onClick={handleToggleRecording} />
        {results && (
          <button type="button" className="btn btn-ghost" onClick={handleRetry} disabled={isRecording}>
            🔁 Đọc lại từ đầu
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={handleFinish} disabled={!results || isRecording}>
          Hoàn thành 🏁
        </button>
      </div>

      {results && (
        <>
          <p className="score-line">
            Kết quả: {correctCount}/{results.length} từ đúng
          </p>
          {incorrectTokens.length === 0 ? (
            <div className="feedback-banner correct">🎉 Con đọc đúng hết cả bài rồi!</div>
          ) : (
            <div className="error-tip-panel">
              <h4>📌 Sửa lỗi đọc — các từ cần luyện lại</h4>
              <ul className="error-tip-list">
                {incorrectTokens.map(({ token, flatIndex }) => (
                  <li key={flatIndex}>
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
