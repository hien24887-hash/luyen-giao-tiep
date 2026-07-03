import { useEffect, useMemo, useRef, useState } from "react";
import type { CommItem } from "../../data/communication";
import { alignTranscript, type WordMatchResult } from "../../lib/matchWords";
import { isSpeechRecognitionSupported, speak, startRecognition, type RecognitionHandle } from "../../lib/speech";
import WordChip, { type ChipStatus } from "../reading/WordChip";
import MicButton from "../reading/MicButton";

interface DialogueCardProps {
  item: CommItem;
  index: number;
  color: string;
  result: WordMatchResult[] | null;
  onResult: (result: WordMatchResult[] | null) => void;
}

interface AnswerToken {
  text: string;
  punct?: string;
  ipa?: string;
}

function tokenizeAnswer(answer: string, answerIpa: string): AnswerToken[] {
  const ipaWords = answerIpa.split(" ");
  return answer.split(" ").map((raw, idx) => {
    const match = raw.match(/^([A-Za-z']+)([.,!?]?)$/);
    const ipa = ipaWords[idx];
    if (!match) return { text: raw, ipa };
    return { text: match[1], punct: match[2] || undefined, ipa };
  });
}

export default function DialogueCard({ item, index, color, result, onResult }: DialogueCardProps) {
  const micSupported = useMemo(() => isSpeechRecognitionSupported(), []);
  const tokens = useMemo(() => tokenizeAnswer(item.answer, item.answerIpa), [item.answer, item.answerIpa]);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const transcriptRef = useRef("");
  const finalizedRef = useRef(false);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function statusFor(idx: number): ChipStatus {
    const found = result?.find((r) => r.index === idx);
    return found ? found.status : "neutral";
  }

  function finalizeAnswer(transcript: string) {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    const expectedWords = tokens.map((t) => t.text);
    const heardWords = transcript.split(/\s+/).filter(Boolean);
    onResult(alignTranscript(expectedWords, heardWords));
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
        finalizeAnswer(transcriptRef.current);
      },
      onError: () => {
        setIsRecording(false);
        finalizeAnswer(transcriptRef.current);
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
    onResult(null);
    setLiveTranscript("");
  }

  function handleWordClick(token: AnswerToken) {
    if (isRecording) return;
    speak(token.text);
  }

  const incorrectTokens: { token: AnswerToken; index: number }[] = result
    ? result.filter((r) => r.status === "incorrect").map((r) => ({ token: tokens[r.index], index: r.index }))
    : [];
  const correctCount = result ? result.length - incorrectTokens.length : 0;

  return (
    <article className="dialogue-card" style={{ "--rule-color": color } as React.CSSProperties}>
      <div className="dialogue-card__header">
        <span className="dialogue-card__index">{index + 1}</span>
        <span className="dialogue-card__icon">{item.icon}</span>
        <button type="button" className="dialogue-card__term" onClick={() => speak(item.term)} title="Nghe từ khoá">
          🔊 {item.term}
        </button>
        <span className="dialogue-card__term-ipa">{item.termIpa}</span>
      </div>
      <p className="dialogue-card__term-meaning">{item.termMeaning}</p>

      <div className="dialogue-line dialogue-line--q">
        <span className="dialogue-line__label">❓ Người khác hỏi</span>
        <p className="dialogue-line__text">{item.question}</p>
        <p className="dialogue-line__ipa">{item.questionIpa}</p>
        <p className="dialogue-line__meaning">{item.questionMeaning}</p>
      </div>

      <div className="dialogue-line dialogue-line--a">
        <span className="dialogue-line__label">💬 Con trả lời</span>
        <div className="sentence-row">
          {tokens.map((token, idx) => (
            <WordChip
              key={idx}
              text={token.text + (token.punct ?? "")}
              ipa={token.ipa}
              status={statusFor(idx)}
              onClick={() => handleWordClick(token)}
            />
          ))}
        </div>
        <p className="dialogue-line__meaning">{item.answerMeaning}</p>
      </div>

      {!micSupported && (
        <p className="unsupported-note">
          ⚠️ Trình duyệt này không hỗ trợ nhận diện giọng nói — hãy mở bằng Google Chrome để luyện nói được chấm điểm.
        </p>
      )}

      {isRecording && (
        <p className="unsupported-note">
          🎙 Đang nghe, con cứ trả lời tự nhiên... {liveTranscript}
          <br />
          Nói xong thì bấm "Dừng đọc".
        </p>
      )}

      <div className="btn-row" style={{ marginTop: "0.8rem" }}>
        <button type="button" className="btn btn-ghost" onClick={() => speak(item.question)} disabled={isRecording}>
          🔊 Nghe câu hỏi
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => speak(item.answer)} disabled={isRecording}>
          🔊 Nghe câu trả lời mẫu
        </button>
        <MicButton recording={isRecording} supported={micSupported} onClick={handleToggleRecording} />
        {result && (
          <button type="button" className="btn btn-ghost" onClick={handleRetry} disabled={isRecording}>
            🔁 Thử lại
          </button>
        )}
      </div>

      {result && (
        <>
          <p className="score-line">
            {correctCount}/{result.length} từ đúng
          </p>
          {incorrectTokens.length === 0 ? (
            <div className="feedback-banner correct">🎉 Con trả lời đúng hết câu này rồi!</div>
          ) : (
            <div className="error-tip-panel">
              <h4>📌 Sửa lỗi đọc — các từ cần luyện lại</h4>
              <ul className="error-tip-list">
                {incorrectTokens.map(({ token, index: idx }) => (
                  <li key={idx}>
                    <button
                      type="button"
                      className="chip chip-error"
                      onClick={() => speak(token.text)}
                      title="Nghe lại từ này"
                    >
                      🔊 {token.text}
                    </button>
                    {token.ipa && <span className="rule-card__word-ipa">{token.ipa}</span>}
                    <span>💡 Hãy nghe kỹ âm mẫu rồi đọc lại thật chậm, chú ý trọng âm của từ.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </article>
  );
}
