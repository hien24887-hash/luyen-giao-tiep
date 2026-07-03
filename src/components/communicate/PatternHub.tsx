import type { CommTopic } from "../../data/communication";
import { speak } from "../../lib/speech";

interface PatternHubProps {
  topic: CommTopic;
}

export default function PatternHub({ topic }: PatternHubProps) {
  return (
    <div className="pattern-hub" style={{ "--rule-color": topic.color } as React.CSSProperties}>
      <div className="pattern-hub__title">
        <span className="pattern-hub__icon">{topic.icon}</span>
        <div>
          <div className="pattern-hub__title-en">{topic.title}</div>
          <div className="pattern-hub__title-vi">{topic.titleVi}</div>
        </div>
      </div>

      <button type="button" className="pattern-hub__pattern" onClick={() => speak(topic.pattern)} title="Nghe mẫu câu">
        🔊 {topic.pattern}
      </button>
      <p className="pattern-hub__pattern-meaning">({topic.patternMeaning})</p>

      <div className="pattern-hub__formula">
        {topic.formula.map((line) => (
          <div className="pattern-hub__formula-line" key={line.label}>
            <span className="pattern-hub__formula-label">📌 {line.label}:</span> {line.text}
          </div>
        ))}
      </div>

      <p className="pattern-hub__explanation">👉 Giải thích: {topic.explanation}</p>

      <div className="tip-bar">💡 TIP: {topic.tip}</div>
    </div>
  );
}
