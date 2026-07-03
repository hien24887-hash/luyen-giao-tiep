// Xuất hội thoại thành 1 file HTML độc lập, tải trực tiếp về máy (không qua
// hộp thoại In của trình duyệt) — mở file này lên vẫn xem/in đẹp được vì nó
// tự mang theo style riêng, không phụ thuộc app.

import type { DialogueTopic } from "../data/dialogues";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function dialogueSectionHtml(topic: DialogueTopic): string {
  const lines = topic.lines
    .map(
      (line) => `
      <li>
        <strong>${escapeHtml(line.speaker)}:</strong> ${escapeHtml(line.text)}
        <div class="ipa">/${escapeHtml(line.ipa)}/</div>
        <div class="meaning">${escapeHtml(line.meaning)}</div>
      </li>`
    )
    .join("");
  return `
    <section>
      <h2>${topic.icon} ${escapeHtml(topic.title)} <span class="vi">— ${escapeHtml(topic.titleVi)}</span></h2>
      <ol>${lines}</ol>
    </section>`;
}

const STYLE = `
  body { font-family: "Times New Roman", Times, serif; color: #1b1b1b; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  h1 { text-align: center; color: #5b1a13; }
  .subtitle { text-align: center; font-style: italic; margin-bottom: 2rem; }
  section { margin-bottom: 2.5rem; }
  h2 { border-bottom: 2px solid #5b1a13; padding-bottom: 0.3rem; color: #5b1a13; }
  .vi { font-weight: normal; font-style: italic; color: #555; }
  ol { padding-left: 1.4rem; }
  li { margin-bottom: 1rem; }
  .ipa { color: #117864; font-style: italic; }
  .meaning { color: #555; font-style: italic; }
  @media print {
    section { page-break-after: always; }
    section:last-of-type { page-break-after: auto; }
  }
`;

function wrapHtmlDocument(title: string, bodyContent: string): string {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${bodyContent}
</body>
</html>
`;
}

export function buildDialogueHtml(topic: DialogueTopic): string {
  const body = `
    <h1>${escapeHtml(topic.title)}</h1>
    <p class="subtitle">${escapeHtml(topic.titleVi)} — ${topic.lines.length} câu</p>
    ${dialogueSectionHtml(topic)}`;
  return wrapHtmlDocument(`${topic.title} — ${topic.titleVi}`, body);
}

export function buildAllDialoguesHtml(topics: DialogueTopic[]): string {
  const body = `
    <h1>Luyện Giao Tiếp Tiếng Anh — Hội thoại</h1>
    <p class="subtitle">${topics.length} bài hội thoại — nghe, đọc theo, luyện phát âm</p>
    ${topics.map(dialogueSectionHtml).join("")}`;
  return wrapHtmlDocument("Luyện Giao Tiếp Tiếng Anh — Hội thoại", body);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function dialogueFilename(topic: DialogueTopic): string {
  return `hoi-thoai-${slugify(topic.title)}.html`;
}

export function downloadHtmlFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
