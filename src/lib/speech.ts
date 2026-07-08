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

// Nhận diện giọng nói (STT) lại là chuyện khác: bé là người Việt học tiếng
// Anh, giọng đọc chắc chắn không chuẩn bản xứ dù Anh-Anh hay Anh-Mỹ. Model
// nhận diện "en-US" của Google được huấn luyện trên lượng dữ liệu lớn hơn
// và bao dung hơn với giọng không bản xứ so với "en-GB" — dùng "en-GB" cho
// STT chỉ khiến app "nghe" sai nhiều hơn mà không giúp gì cho việc dạy
// phát âm (phần dạy phát âm British vẫn nằm ở TTS/quy tắc, không liên quan
// đến việc máy có nhận ra đúng từ bé vừa nói hay không).
const RECOGNITION_LANG = "en-US";

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
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    // Chrome trên Android thường chưa nạp xong danh sách giọng đọc ngay lần
    // bấm đầu tiên (sự kiện "voiceschanged" bắn hơi trễ) — nếu gọi speak()
    // ngay lúc này rất dễ ra im lặng hoàn toàn. Đợi 1 nhịp ngắn rồi thử lại
    // đúng 1 lần thay vì bỏ cuộc luôn.
    window.setTimeout(() => speakNow(text, opts), 300);
    return;
  }
  speakNow(text, opts);
}

function speakNow(text: string, opts?: { rate?: number; lang?: string }): void {
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

/** Chuyển mã lỗi nhận diện giọng nói (từ onError) thành thông báo tiếng Việt dễ hiểu. */
export function describeMicError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "⚠️ Trình duyệt chưa được cấp quyền micro. Vui lòng bật quyền micro cho trang này rồi bấm lại.";
    case "audio-capture":
      return "⚠️ Không tìm thấy micro trên thiết bị này. Vui lòng kiểm tra lại micro rồi thử lại.";
    default:
      return "⚠️ Không thể sử dụng micro lúc này. Vui lòng thử lại.";
  }
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
  const maybeCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!maybeCtor) return null;
  const Ctor = maybeCtor;

  // Chrome trên Android thường tự kết thúc phiên nghe sau một khoảng lặng
  // ngắn dù đã đặt continuous=true (khác hẳn Chrome desktop) — nếu coi đó
  // là "nghe xong" thì bé chưa kịp đọc gì app đã dừng. Vì vậy phải tự khởi
  // động lại phiên nghe mới bất cứ khi nào onend xảy ra mà KHÔNG phải do
  // người dùng chủ động bấm dừng, và cộng dồn transcript qua các phiên.
  let stoppedByUser = false;
  // Văn bản đã "chốt" từ các phiên nghe TRƯỚC (trước khi bị Android tự ngắt
  // và khởi động lại) — cộng dồn qua các phiên, KHÁC với transcript của
  // phiên đang chạy (lastSessionText), vì mỗi phiên mới có event.results
  // riêng, bắt đầu lại từ rỗng.
  let carriedTranscript = "";
  let lastSessionText = "";
  let lang = opts.lang ?? RECOGNITION_LANG;
  let triedFallbackLang = false;
  let recognition: SpeechRecognitionLike = new Ctor();

  function attach(instance: SpeechRecognitionLike) {
    instance.lang = lang;
    instance.continuous = opts.continuous ?? true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;

    instance.onresult = (event) => {
      // Tính lại TOÀN BỘ transcript của phiên hiện tại từ đầu mỗi lần có kết
      // quả mới (event.results luôn chứa đủ lịch sử của phiên đang chạy) —
      // KHÔNG được cộng dồn kiểu "+=" vào 1 biến ngoài, nếu không các đoạn
      // đã chốt (final) sẽ bị nhân bản lặp lại mỗi khi có thêm kết quả mới.
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + " ";
      }
      lastSessionText = text.trim();
      opts.onResult((carriedTranscript + " " + lastSessionText).trim(), false);
    };

    instance.onerror = (event) => {
      // Một số máy Android không hỗ trợ locale "en-GB" cho nhận diện giọng
      // nói (chỉ có "en-US" cài sẵn) và báo lỗi ngay lập tức — thử lại 1 lần
      // với "en-US" trước khi báo lỗi thật sự cho người dùng.
      if (event.error === "language-not-supported" && !triedFallbackLang && lang !== "en-US") {
        triedFallbackLang = true;
        lang = "en-US";
        return; // onend sẽ tự khởi động lại phiên nghe với lang mới
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") {
        // Từ chối quyền micro, trình duyệt chặn hẳn tính năng, hoặc không tìm
        // thấy micro nào trên thiết bị — không có ý nghĩa để thử lại (thử lại
        // mãi chỉ khiến nút kẹt ở "Đang nghe" vô thời hạn mà không báo gì, bé
        // sẽ tưởng app bị treo). Đây là lỗi thật sự cần báo ra ngoài.
        stoppedByUser = true;
        opts.onError?.(event.error);
        return;
      }
      // Các lỗi còn lại (no-speech, network, aborted...) chỉ là tạm thời — ví
      // dụ "no-speech" có thể bắn ra chỉ sau 1-2 giây im lặng, RẤT LÂU TRƯỚC
      // khi bé kịp mở miệng đọc. Trước đây mọi lỗi đều được báo ra ngoài,
      // khiến nơi gọi (DialogueLineCard/DialogueCard) chốt luôn kết quả ngay
      // lập tức — coi như bé chưa đọc gì mà đã tính sai hết. Giờ để onend tự
      // khởi động lại phiên nghe mới trong im lặng, không báo lỗi ra ngoài,
      // để UI "đang nghe" không bị ngắt giữa chừng.
    };

    instance.onend = () => {
      if (stoppedByUser) {
        opts.onEnd?.();
        return;
      }
      // Gộp phần đã nghe được của phiên vừa kết thúc vào phần "đã chốt" rồi
      // mới mở phiên nghe mới, để không mất nội dung khi event.results reset.
      carriedTranscript = (carriedTranscript + " " + lastSessionText).trim();
      lastSessionText = "";
      try {
        recognition = new Ctor();
        attach(recognition);
        recognition.start();
      } catch {
        opts.onEnd?.();
      }
    };

    instance.start();
  }

  attach(recognition);

  return {
    stop: () => {
      stoppedByUser = true;
      recognition.stop();
    },
  };
}
