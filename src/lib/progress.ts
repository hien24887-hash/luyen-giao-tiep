// Lưu tiến trình luyện tập nhẹ vào localStorage (không cần backend).
// App độc lập với "Luyện Phiên Âm IPA" nên dùng key lưu trữ riêng — không
// chia sẻ điểm/sao giữa 2 app.

const STORAGE_KEY = "giao-tiep-app-progress-v1";

// Quy đổi thưởng: 10 ngôi sao -> 1 cúp, 50 cúp -> 50.000đ tiền thưởng.
const STARS_PER_TROPHY = 10;
const TROPHIES_PER_REWARD = 50;
const MONEY_PER_REWARD_VND = 50000;

interface ProgressState {
  topicScores: Record<string, { correct: number; total: number; playedAt: string }>;
  totalStars: number;
}

const EMPTY_STATE: ProgressState = { topicScores: {}, totalStars: 0 };

function loadState(): ProgressState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { topicScores: {}, totalStars: 0 };
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      topicScores: parsed.topicScores ?? {},
      totalStars: parsed.totalStars ?? 0,
    };
  } catch {
    return { topicScores: {}, totalStars: 0 };
  }
}

function saveState(state: ProgressState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Các component (VD: huy hiệu thưởng ở header) đăng ký nghe ở đây để tự cập
// nhật ngay khi có nơi khác vừa cộng thêm sao.
type Listener = () => void;
const listeners = new Set<Listener>();
function notify(): void {
  listeners.forEach((cb) => cb());
}
export function subscribeRewards(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function recordTopicScore(topicId: string, correct: number, total: number): void {
  const state = loadState();
  state.topicScores[topicId] = { correct, total, playedAt: new Date().toISOString() };
  saveState(state);
}

export interface RewardTotals {
  totalStars: number;
  totalTrophies: number;
  totalMoneyVnd: number;
}

export interface AwardResult extends RewardTotals {
  /** Số cúp MỚI vừa đạt được ở lần cộng sao này (0 nếu chưa đủ mốc). */
  newTrophies: number;
  /** Số tiền MỚI vừa đạt được ở lần cộng sao này (0 nếu chưa đủ mốc). */
  newMoneyVnd: number;
}

function trophiesFor(stars: number): number {
  return Math.floor(stars / STARS_PER_TROPHY);
}
function moneyFor(trophies: number): number {
  return Math.floor(trophies / TROPHIES_PER_REWARD) * MONEY_PER_REWARD_VND;
}

export function getRewards(): RewardTotals {
  const stars = loadState().totalStars;
  const trophies = trophiesFor(stars);
  return { totalStars: stars, totalTrophies: trophies, totalMoneyVnd: moneyFor(trophies) };
}

/** Cộng thêm sao khi bé hoàn thành 1 chủ đề giao tiếp. */
export function awardStars(amount: number): AwardResult {
  const state = loadState();
  const before = state.totalStars;
  const beforeTrophies = trophiesFor(before);
  const beforeMoney = moneyFor(beforeTrophies);

  const after = before + amount;
  state.totalStars = after;
  saveState(state);

  const afterTrophies = trophiesFor(after);
  const afterMoney = moneyFor(afterTrophies);
  notify();

  return {
    totalStars: after,
    totalTrophies: afterTrophies,
    totalMoneyVnd: afterMoney,
    newTrophies: afterTrophies - beforeTrophies,
    newMoneyVnd: afterMoney - beforeMoney,
  };
}
