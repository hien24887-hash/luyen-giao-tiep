import type { DialogueTopic } from "../../data/dialogues";

interface PrintableDialoguesProps {
  topics: DialogueTopic[];
}

// Bản in/tải xuống — ẩn hoàn toàn khi xem trên màn hình (CSS .print-sheet),
// chỉ hiện ra khi in (window.print()) hoặc "Save as PDF" từ hộp thoại in của
// trình duyệt. Không dùng thư viện PDF ngoài — tận dụng in trực tiếp của
// trình duyệt để giữ app nhẹ và hoạt động ngay cả khi offline.
export default function PrintableDialogues({ topics }: PrintableDialoguesProps) {
  return (
    <div className="print-sheet">
      <h1 className="print-sheet__title">Luyện Giao Tiếp Tiếng Anh — Hội thoại</h1>
      <p className="print-sheet__subtitle">{topics.length} bài hội thoại — nghe, đọc theo, luyện phát âm</p>
      {topics.map((topic) => (
        <section className="print-dialogue" key={topic.id}>
          <h2>
            {topic.icon} {topic.title} <span className="print-dialogue__vi">— {topic.titleVi}</span>
          </h2>
          <ol className="print-dialogue__lines">
            {topic.lines.map((line, idx) => (
              <li key={idx}>
                <span className="print-line__speaker">{line.speaker}:</span> {line.text}
                <div className="print-line__ipa">/{line.ipa}/</div>
                <div className="print-line__meaning">{line.meaning}</div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
