// Wrapper mỏng quanh Web Speech API: nói mẫu (TTS) + nhận diện giọng nói.
// Nhận diện giọng nói chỉ được Chrome hỗ trợ tốt nên luôn phải feature-detect
// trước khi dùng và báo cho người dùng biết nếu trình duyệt không hỗ trợ.

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Tốc độ đọc mẫu mặc định — chậm hơn tốc độ nói bình thường (1.0) để bé
// nghe rõ từng âm, nhưng không quá chậm đến mức méo tiếng.
const DEFAULT_TTS_RATE = 0.7;

// Toàn bộ quy tắc/phiên âm trong app dạy theo giọng Anh-Anh (British, non-
// rhotic): "r" đứng sau nguyên âm KHÔNG đọc (car → /kɑː/, her → /hɜː/...),
// và có âm /ɒ/ tròn môi tách biệt với /ɑː/. Nếu phát bằng giọng Mỹ (en-US),
// máy sẽ đọc rõ âm "r" và gộp /ɒ/ vào /ɑː/ — mâu thuẫn trực tiếp với quy tắc
// đang dạy. Vì vậy toàn bộ audio trong app phải dùng giọng Anh-Anh.
const DEFAULT_LANG = "en-GB";

// Danh sách giọng đọc có sẵn của trình duyệt chỉ được nạp bất đồng bộ; cache
// lại và lắng nghe sự kiện "voiceschanged" để khi người dùng bấm nghe lần
// đầu, danh sách gần như chắc chắn đã có sẵn.
let cachedVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && isSpeechSynthesisSupported()) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

// Máy của người dùng có thể KHÔNG cài giọng đọc Anh-Anh (rất nhiều máy
// Windows ở Việt Nam chỉ có sẵn giọng tiếng Việt + tiếng Anh-Mỹ mặc định).
// Nếu ép cứng "en-GB" mà máy không có giọng đó, trình duyệt có thể chọn đại
// 1 giọng hoàn toàn sai ngôn ngữ (nghe "sai hết") thay vì tự nhận ra không có
// giọng phù hợp. Vì vậy phải dò theo thứ tự ưu tiên và luôn có phương án dự
// phòng, thay vì chỉ đặt `lang` suông rồi hy vọng trình duyệt tự lo.
function pickEnglishVoice(preferredLangPrefix: string): SpeechSynthesisVoice | undefined {
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(preferredLangPrefix.toLowerCase())) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en"))
  );
}

export function speak(text: string, opts?: { rate?: number; lang?: string }): void {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const preferredLang = opts?.lang ?? DEFAULT_LANG;
  const voice = pickEnglishVoice(preferredLang);
  if (voice) {
    // Đặt lang khớp với giọng thực sự tìm được (không ép "en-GB" lên 1
    // giọng en-US/khác — dễ gây méo tiếng nếu giọng và lang không khớp).
    utter.voice = voice;
    utter.lang = voice.lang;
  } else {
    // Máy hoàn toàn không có giọng tiếng Anh nào — vẫn thử với "en-US" vì
    // đây là giọng phổ biến nhất, khả năng trình duyệt tự lo được cao hơn
    // "en-GB" hiếm gặp.
    utter.lang = "en-US";
  }
  utter.rate = opts?.rate ?? DEFAULT_TTS_RATE;
  window.speechSynthesis.speak(utter);
}

export interface RecognitionHandle {
  stop: () => void;
}

export interface StartRecognitionOptions {
  lang?: string;
  /** Mặc định true: tiếp tục nghe qua các khoảng ngắt nghỉ giữa các từ/cụm
   * từ, để bé có đủ thời gian đọc hết cả câu thay vì bị cắt ngang giữa
   * chừng. Việc dừng do người dùng chủ động bấm "Dừng đọc" hoặc do
   * timeout an toàn ở nơi gọi hàm này quyết định, không phải do 1 khoảng
   * lặng ngắn. */
  continuous?: boolean;
  onResult: (transcript: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export function startRecognition(opts: StartRecognitionOptions): RecognitionHandle | null {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = opts.lang ?? DEFAULT_LANG;
  recognition.continuous = opts.continuous ?? true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    // Gộp toàn bộ kết quả từ đầu phiên nghe (không chỉ từ resultIndex trở
    // đi) — ở chế độ continuous, mỗi câu/cụm được xác nhận (final) riêng
    // lẻ, nếu chỉ lấy từ resultIndex sẽ làm mất phần đã đọc trước đó.
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript + " ";
    }
    const lastResult = event.results[event.results.length - 1];
    opts.onResult(transcript.trim(), lastResult?.isFinal ?? false);
  };
  recognition.onerror = (event) => opts.onError?.(event.error);
  recognition.onend = () => opts.onEnd?.();

  recognition.start();

  return {
    stop: () => recognition.stop(),
  };
}
