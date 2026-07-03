export type ChipStatus = "neutral" | "correct" | "incorrect";

interface WordChipProps {
  text: string;
  ipa?: string;
  status: ChipStatus;
  onClick?: () => void;
}

export default function WordChip({ text, ipa, status, onClick }: WordChipProps) {
  return (
    <button
      type="button"
      className={"word-chip" + (status !== "neutral" ? ` ${status}` : "")}
      onClick={onClick}
      title="Bấm để nghe lại từ này"
    >
      <span className="word-chip__text">{text}</span>
      {ipa && <span className="word-chip__ipa">{ipa}</span>}
    </button>
  );
}
