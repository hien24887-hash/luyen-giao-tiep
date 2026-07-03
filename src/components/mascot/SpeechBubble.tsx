import type { ReactNode } from "react";

interface SpeechBubbleProps {
  children: ReactNode;
}

export default function SpeechBubble({ children }: SpeechBubbleProps) {
  return (
    <div className="speech-bubble">
      <p>{children}</p>
    </div>
  );
}
