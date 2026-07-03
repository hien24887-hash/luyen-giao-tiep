interface MicButtonProps {
  recording: boolean;
  supported: boolean;
  onClick: () => void;
}

export default function MicButton({ recording, supported, onClick }: MicButtonProps) {
  return (
    <button
      type="button"
      className={"btn btn-primary mic-button" + (recording ? " recording" : "")}
      onClick={onClick}
      disabled={!supported}
    >
      {recording ? "⏹ Dừng đọc" : "🎙 Bắt đầu đọc"}
    </button>
  );
}
