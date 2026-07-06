// Tài khoản học viên (đăng nhập email/mật khẩu qua Firebase Authentication) +
// tiến trình luyện tập lưu trên Firestore, để mỗi bé có 1 tài khoản riêng và
// có thể đăng nhập từ bất kỳ máy/điện thoại nào cũng thấy đúng tiến độ của
// mình (khác với bản trước chỉ lưu trong localStorage của 1 trình duyệt).

import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// Quy đổi thưởng: 10 ngôi sao -> 1 cúp, 50 cúp -> 50.000đ tiền thưởng.
const STARS_PER_TROPHY = 10;
const TROPHIES_PER_REWARD = 50;
const MONEY_PER_REWARD_VND = 50000;

// Dùng thử miễn phí 4 ngày kể từ lúc tạo tài khoản, sau đó phải thanh toán 1
// lần để dùng trọn đời. Tài khoản trùng email này có quyền duyệt thanh toán
// cho MỌI học viên (xem thêm ở Firestore Rules — chỉ email này mới được phép
// ghi đè trường "paid" của người khác).
export const ADMIN_EMAIL = "hien24887@gmail.com";
export const TRIAL_DAYS = 4;

export interface Student {
  id: string;
  name: string;
  createdAt: string;
}

interface TopicScore {
  correct: number;
  total: number;
  playedAt: string;
}

interface StudentDoc {
  name: string;
  email: string;
  createdAt: string;
  topicScores: Record<string, TopicScore>;
  totalStars: number;
  paid: boolean;
}

// ---------------------------------------------------------------------------
// Trạng thái đăng nhập hiện tại — được Firebase đồng bộ bất đồng bộ, cache lại
// ở đây để các hàm cộng sao/ghi điểm vẫn có thể trả về kết quả NGAY LẬP TỨC
// (đồng bộ) cho UI, thay vì phải đợi round-trip mạng mỗi lần bé trả lời đúng.
// ---------------------------------------------------------------------------
let currentUser: User | null = null;
let cache: StudentDoc | null = null;
let authResolved = false;
let unsubscribeDoc: (() => void) | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();
function notify(): void {
  listeners.forEach((cb) => cb());
}
export function subscribeRewards(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    authResolved = true;
    if (unsubscribeDoc) {
      unsubscribeDoc();
      unsubscribeDoc = null;
    }
    if (user) {
      unsubscribeDoc = onSnapshot(doc(db, "students", user.uid), (snap) => {
        cache = snap.exists() ? (snap.data() as StudentDoc) : null;
        notify();
      });
    } else {
      cache = null;
      notify();
    }
    notify();
  });
}

/** true khi Firebase đã xác định xong có phiên đăng nhập cũ hay không. */
export function isAuthResolved(): boolean {
  return authResolved;
}

export function getCurrentStudent(): Student | null {
  if (!currentUser || !cache) return null;
  return { id: currentUser.uid, name: cache.name, createdAt: cache.createdAt };
}

/** true nếu tài khoản đang đăng nhập là tài khoản phụ huynh có quyền duyệt thanh toán. */
export function isAdmin(): boolean {
  return currentUser?.email === ADMIN_EMAIL;
}

export interface AccessStatus {
  paid: boolean;
  daysLeft: number;
  trialExpired: boolean;
}

function computeAccessStatus(createdAt: string, paid: boolean): AccessStatus {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));
  return { paid, daysLeft, trialExpired: !paid && daysLeft <= 0 };
}

/** Trạng thái dùng thử/đã thanh toán của học viên đang đăng nhập. */
export function getAccessStatus(): AccessStatus | null {
  if (!currentUser || !cache) return null;
  return computeAccessStatus(cache.createdAt, cache.paid ?? false);
}

// ---------------------------------------------------------------------------
// Đăng ký / đăng nhập / đăng xuất
// ---------------------------------------------------------------------------

export async function signUp(name: string, email: string, password: string): Promise<void> {
  const trimmedName = name.trim() || "Học viên";
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    await updateProfile(cred.user, { displayName: trimmedName });
    const initialDoc: StudentDoc = {
      name: trimmedName,
      email: email.trim(),
      createdAt: new Date().toISOString(),
      topicScores: {},
      totalStars: 0,
      paid: false,
    };
    await setDoc(doc(db, "students", cred.user.uid), initialDoc);
    // Cập nhật cache ngay để UI không phải đợi onSnapshot phản hồi từ server.
    currentUser = cred.user;
    cache = initialDoc;
    notify();
  } catch (err) {
    // Lưu hồ sơ thất bại (thường do mất mạng giữa chừng) — hủy luôn tài khoản
    // vừa tạo, tránh để lại 1 tài khoản đăng nhập được nhưng không có hồ sơ
    // (học viên sẽ tưởng nhầm là "không đăng nhập được" ở lần sau).
    await deleteUser(cred.user).catch(() => {});
    throw err;
  }
}

export async function logIn(email: string, password: string): Promise<void> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const snap = await getDoc(doc(db, "students", cred.user.uid));
  if (!snap.exists()) {
    // Tài khoản có thể đăng nhập nhưng thiếu hồ sơ dữ liệu (ví dụ do lỗi mạng
    // lúc đăng ký trước đây) — báo rõ thay vì để màn hình lặp lại im lặng.
    await signOut(auth);
    throw Object.assign(new Error("Missing student profile"), { code: "app/missing-profile" });
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

/** Gửi email đặt lại mật khẩu — dùng khi học viên quên mật khẩu. */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/** Chuyển mã lỗi Firebase thành thông báo tiếng Việt dễ hiểu cho phụ huynh/bé. */
export function translateAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "app/missing-profile":
      return "Tài khoản này bị thiếu hồ sơ dữ liệu (thường do mất mạng lúc đăng ký trước đây) — vui lòng tạo tài khoản mới với email này.";
    case "auth/email-already-in-use":
      return "Email này đã được đăng ký rồi — hãy chọn “Đăng nhập” thay vì tạo tài khoản mới.";
    case "auth/invalid-email":
      return "Email không hợp lệ, vui lòng kiểm tra lại.";
    case "auth/weak-password":
      return "Mật khẩu quá ngắn — cần ít nhất 6 ký tự.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email hoặc mật khẩu không đúng.";
    case "auth/too-many-requests":
      return "Bạn đã thử sai quá nhiều lần — vui lòng đợi một chút rồi thử lại.";
    default:
      return "Có lỗi xảy ra, vui lòng thử lại.";
  }
}

// ---------------------------------------------------------------------------
// Điểm thưởng / tiến độ của học viên đang đăng nhập
// ---------------------------------------------------------------------------

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
  const stars = cache?.totalStars ?? 0;
  const trophies = trophiesFor(stars);
  return { totalStars: stars, totalTrophies: trophies, totalMoneyVnd: moneyFor(trophies) };
}

export function recordTopicScore(topicId: string, correct: number, total: number): void {
  if (!currentUser || !cache) return;
  cache.topicScores[topicId] = { correct, total, playedAt: new Date().toISOString() };
  updateDoc(doc(db, "students", currentUser.uid), { topicScores: cache.topicScores }).catch(() => {
    // Lỗi mạng tạm thời — dữ liệu vẫn đúng ở cache cục bộ, onSnapshot lần sau sẽ tự đồng bộ lại.
  });
  notify();
}

/** Cộng thêm sao cho học viên đang đăng nhập khi hoàn thành 1 chủ đề/hội thoại. */
export function awardStars(amount: number): AwardResult {
  if (!currentUser || !cache) {
    return { totalStars: 0, totalTrophies: 0, totalMoneyVnd: 0, newTrophies: 0, newMoneyVnd: 0 };
  }

  const before = cache.totalStars;
  const beforeTrophies = trophiesFor(before);
  const beforeMoney = moneyFor(beforeTrophies);

  const after = before + amount;
  cache.totalStars = after;
  updateDoc(doc(db, "students", currentUser.uid), { totalStars: after }).catch(() => {});
  notify();

  const afterTrophies = trophiesFor(after);
  const afterMoney = moneyFor(afterTrophies);

  return {
    totalStars: after,
    totalTrophies: afterTrophies,
    totalMoneyVnd: afterMoney,
    newTrophies: afterTrophies - beforeTrophies,
    newMoneyVnd: afterMoney - beforeMoney,
  };
}

// ---------------------------------------------------------------------------
// Theo dõi tổng hợp — dùng cho màn hình "Theo dõi học viên". Đọc trực tiếp từ
// Firestore (không phải chỉ tài khoản đang đăng nhập) nên cần gọi bất đồng bộ.
// ---------------------------------------------------------------------------

export interface StudentSummary extends RewardTotals {
  student: Student;
  topicsCompleted: number;
  dialoguesCompleted: number;
  lastActive: string | null;
  access: AccessStatus;
}

export async function fetchAllStudentSummaries(): Promise<StudentSummary[]> {
  const snap = await getDocs(collection(db, "students"));
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() as StudentDoc;
    const trophies = trophiesFor(data.totalStars ?? 0);
    const entries = Object.entries(data.topicScores ?? {});
    const topicsCompleted = entries.filter(([id]) => !id.startsWith("dialogue-")).length;
    const dialoguesCompleted = entries.filter(([id]) => id.startsWith("dialogue-")).length;
    const lastActive = entries.reduce<string | null>((latest, [, score]) => {
      if (!latest || score.playedAt > latest) return score.playedAt;
      return latest;
    }, null);
    return {
      student: { id: docSnap.id, name: data.name, createdAt: data.createdAt },
      totalStars: data.totalStars ?? 0,
      totalTrophies: trophies,
      totalMoneyVnd: moneyFor(trophies),
      topicsCompleted,
      dialoguesCompleted,
      lastActive,
      access: computeAccessStatus(data.createdAt, data.paid ?? false),
    };
  });
}

/** Chỉ tài khoản ADMIN_EMAIL mới ghi được (Firestore Rules chặn người khác). */
export async function markStudentPaid(studentId: string): Promise<void> {
  await updateDoc(doc(db, "students", studentId), { paid: true });
}
