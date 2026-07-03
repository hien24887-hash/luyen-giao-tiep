import { useEffect, useMemo, useRef, useState } from "react";
import type { DialogueLine } from "../../data/dialogues";
import { alignTranscript, type WordMatchResult } from "../../lib/matchWords";
import { isSpeechRecognitionSupported, speak, startRecognition, type RecognitionHandle } from "../../lib/speech";
import WordChip, { type ChipStatus } from "../reading/WordChip";
import MicButton from "../reading/MicButton";

interface DialogueLineCardProps {
  line: DialogueLine;
  color: string;
  result: WordMatchResult[] | null;
  onResult: (result: WordMatchResult[] | null) => void;
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

export default function DialogueLineCard({ line, color, result, onResult }: DialogueLineCardProps) {
  const micSupported = useMemo(() => isSpeechRecognitionSupported(), []);
  const tokens = useMemo(() => tokenizeLine(line.text), [line.text]);
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

  function finalizeLine(transcript: string) {
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

  function handleRetry() {
    recognitionRef.current?.stop();
    onResult(null);
    setLiveTranscript("");
  }

  function handleWordClick(token: LineToken) {
    if (isRecording) return;
    speak(token.text);
  }

  const incorrectTokens: { token: LineToken; index: number }[] = result
    ? result.filter((r) => r.status === "incorrect").map((r) => ({ token: tokens[r.index], index: r.index }))
    : [];
  const correctCount = result ? result.length - incorrectTokens.length : 0;

  return (
    <div className="dialogue-turn" style={{ "--rule-color": color } as React.CSSProperties}>
      <div className="dialogue-turn__header">
        <span className="dialogue-turn__speaker" style={{ color }}>
          {line.speaker}
        </span>
        <button
          type="button"
          className="btn btn-ghost dialogue-turn__listen"
          onClick={() => speak(line.text)}
          disabled={isRecording}
          title="Nghe câu này"
        >
          🔊
        </button>
      </div>
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
      <p className="dialogue-line__ipa">{line.ipa}</p>
      <p className="dialogue-line__meaning">{line.meaning}</p>

      {isRecording && (
        <p className="unsupported-note">
          🎙 Đang nghe... {liveTranscript}
          <br />
          Đọc xong thì bấm "Dừng đọc".
        </p>
      )}

      <div className="btn-row" style={{ marginTop: "0.7rem" }}>
        <MicButton recording={isRecording} supported={micSupported} onClick={handleToggleRecording} />
        {result && (
          <button type="button" className="btn btn-ghost" onClick={handleRetry} disabled={isRecording}>
            🔁 Đọc lại câu này
          </button>
        )}
      </div>

      {result && (
        <>
          <p className="score-line" style={{ marginTop: "0.6rem" }}>
            {correctCount}/{result.length} từ đúng
          </p>
          {incorrectTokens.length === 0 ? (
            <div className="feedback-banner correct">🎉 Con đọc đúng hết câu này rồi!</div>
          ) : (
            <div className="error-tip-panel">
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
                    <span>💡 Nghe kỹ rồi đọc lại thật chậm nhé.</span>
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
