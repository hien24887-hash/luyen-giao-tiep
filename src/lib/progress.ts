// Lưu hồ sơ học viên + tiến trình luyện tập của từng học viên vào
// localStorage (không cần backend). Mỗi học viên có điểm sao/cúp/tiến độ
// hoàn toàn riêng, để phụ huynh có thể theo dõi từng bé học đến đâu.

const STUDENTS_KEY = "giao-tiep-app-students-v1";
const PROGRESS_KEY = "giao-tiep-app-progress-v2";
// Key cũ từ trước khi app có khái niệm "học viên" — dữ liệu ở đây được gộp
// vào học viên đầu tiên được tạo, để không mất tiến độ đã có.
const LEGACY_PROGRESS_KEY = "giao-tiep-app-progress-v1";

// Quy đổi thưởng: 10 ngôi sao -> 1 cúp, 50 cúp -> 50.000đ tiền thưởng.
const STARS_PER_TROPHY = 10;
const TROPHIES_PER_REWARD = 50;
const MONEY_PER_REWARD_VND = 50000;

export interface Student {
  id: string;
  name: string;
  createdAt: string;
}

interface StudentsState {
  students: Student[];
  currentStudentId: string | null;
}

interface TopicScore {
  correct: number;
  total: number;
  playedAt: string;
}

interface ProgressState {
  topicScores: Record<string, TopicScore>;
  totalStars: number;
}

type AllProgress = Record<string, ProgressState>;

// ---------------------------------------------------------------------------
// Lưu trữ cấp thấp
// ---------------------------------------------------------------------------

function loadStudentsState(): StudentsState {
  if (typeof window === "undefined") return { students: [], currentStudentId: null };
  try {
    const raw = window.localStorage.getItem(STUDENTS_KEY);
    if (!raw) return { students: [], currentStudentId: null };
    const parsed = JSON.parse(raw) as Partial<StudentsState>;
    return { students: parsed.students ?? [], currentStudentId: parsed.currentStudentId ?? null };
  } catch {
    return { students: [], currentStudentId: null };
  }
}

function saveStudentsState(state: StudentsState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STUDENTS_KEY, JSON.stringify(state));
}

function loadAllProgress(): AllProgress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as AllProgress) : {};
  } catch {
    return {};
  }
}

function saveAllProgress(all: AllProgress): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

function loadProgressFor(studentId: string): ProgressState {
  const all = loadAllProgress();
  return all[studentId] ?? { topicScores: {}, totalStars: 0 };
}

function saveProgressFor(studentId: string, state: ProgressState): void {
  const all = loadAllProgress();
  all[studentId] = state;
  saveAllProgress(all);
}

// Học viên đầu tiên được tạo thừa hưởng tiến độ đã luyện trước khi app có
// khái niệm hồ sơ học viên (nếu có), thay vì để tiến độ đó biến mất.
function migrateLegacyProgressIfNeeded(studentId: string): void {
  if (typeof window === "undefined") return;
  const legacyRaw = window.localStorage.getItem(LEGACY_PROGRESS_KEY);
  if (!legacyRaw) return;
  try {
    const legacy = JSON.parse(legacyRaw) as Partial<ProgressState>;
    if ((legacy.totalStars ?? 0) > 0 || Object.keys(legacy.topicScores ?? {}).length > 0) {
      saveProgressFor(studentId, {
        topicScores: legacy.topicScores ?? {},
        totalStars: legacy.totalStars ?? 0,
      });
    }
  } catch {
    // Dữ liệu cũ hỏng — bỏ qua, không chặn việc tạo học viên mới.
  } finally {
    window.localStorage.removeItem(LEGACY_PROGRESS_KEY);
  }
}

// ---------------------------------------------------------------------------
// Người nghe thay đổi (huy hiệu thưởng, tên học viên ở header tự cập nhật)
// ---------------------------------------------------------------------------
type Listener = () => void;
const listeners = new Set<Listener>();
function notify(): void {
  listeners.forEach((cb) => cb());
}
export function subscribeRewards(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---------------------------------------------------------------------------
// Quản lý hồ sơ học viên
// ---------------------------------------------------------------------------

function genId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function getStudents(): Student[] {
  return loadStudentsState().students;
}

export function getCurrentStudentId(): string | null {
  return loadStudentsState().currentStudentId;
}

export function getCurrentStudent(): Student | null {
  const state = loadStudentsState();
  return state.students.find((s) => s.id === state.currentStudentId) ?? null;
}

/** Tạo hồ sơ học viên mới và chọn làm học viên đang học. */
export function createStudent(name: string): Student {
  const trimmed = name.trim();
  const state = loadStudentsState();
  const student: Student = { id: genId(), name: trimmed || "Học viên", createdAt: new Date().toISOString() };
  const isFirstStudent = state.students.length === 0;
  state.students.push(student);
  state.currentStudentId = student.id;
  saveStudentsState(state);
  if (isFirstStudent) migrateLegacyProgressIfNeeded(student.id);
  notify();
  return student;
}

export function selectStudent(id: string): void {
  const state = loadStudentsState();
  if (!state.students.some((s) => s.id === id)) return;
  state.currentStudentId = id;
  saveStudentsState(state);
  notify();
}

/** Rời khỏi hồ sơ hiện tại, quay về màn hình chọn học viên. */
export function exitToStudentGate(): void {
  const state = loadStudentsState();
  state.currentStudentId = null;
  saveStudentsState(state);
  notify();
}

export function renameStudent(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const state = loadStudentsState();
  const student = state.students.find((s) => s.id === id);
  if (!student) return;
  student.name = trimmed;
  saveStudentsState(state);
  notify();
}

/** Xóa hồ sơ học viên và toàn bộ tiến độ luyện tập của học viên đó. */
export function deleteStudent(id: string): void {
  const state = loadStudentsState();
  state.students = state.students.filter((s) => s.id !== id);
  if (state.currentStudentId === id) {
    state.currentStudentId = null;
  }
  saveStudentsState(state);

  const all = loadAllProgress();
  delete all[id];
  saveAllProgress(all);

  notify();
}

// ---------------------------------------------------------------------------
// Điểm thưởng / tiến độ của học viên đang học
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
  const studentId = getCurrentStudentId();
  const stars = studentId ? loadProgressFor(studentId).totalStars : 0;
  const trophies = trophiesFor(stars);
  return { totalStars: stars, totalTrophies: trophies, totalMoneyVnd: moneyFor(trophies) };
}

export function recordTopicScore(topicId: string, correct: number, total: number): void {
  const studentId = getCurrentStudentId();
  if (!studentId) return;
  const state = loadProgressFor(studentId);
  state.topicScores[topicId] = { correct, total, playedAt: new Date().toISOString() };
  saveProgressFor(studentId, state);
}

/** Cộng thêm sao cho học viên đang học khi hoàn thành 1 chủ đề/hội thoại. */
export function awardStars(amount: number): AwardResult {
  const studentId = getCurrentStudentId();
  if (!studentId) {
    return { totalStars: 0, totalTrophies: 0, totalMoneyVnd: 0, newTrophies: 0, newMoneyVnd: 0 };
  }

  const state = loadProgressFor(studentId);
  const before = state.totalStars;
  const beforeTrophies = trophiesFor(before);
  const beforeMoney = moneyFor(beforeTrophies);

  const after = before + amount;
  state.totalStars = after;
  saveProgressFor(studentId, state);

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

// ---------------------------------------------------------------------------
// Theo dõi tổng hợp — dùng cho màn hình "Theo dõi học viên"
// ---------------------------------------------------------------------------

export interface StudentSummary extends RewardTotals {
  student: Student;
  topicsCompleted: number;
  dialoguesCompleted: number;
  lastActive: string | null;
}

function summarize(studentId: string): Omit<StudentSummary, "student"> {
  const state = loadProgressFor(studentId);
  const trophies = trophiesFor(state.totalStars);
  const entries = Object.entries(state.topicScores);
  const topicsCompleted = entries.filter(([id]) => !id.startsWith("dialogue-")).length;
  const dialoguesCompleted = entries.filter(([id]) => id.startsWith("dialogue-")).length;
  const lastActive = entries.reduce<string | null>((latest, [, score]) => {
    if (!latest || score.playedAt > latest) return score.playedAt;
    return latest;
  }, null);
  return {
    totalStars: state.totalStars,
    totalTrophies: trophies,
    totalMoneyVnd: moneyFor(trophies),
    topicsCompleted,
    dialoguesCompleted,
    lastActive,
  };
}

export function getAllStudentSummaries(): StudentSummary[] {
  return getStudents().map((student) => ({ student, ...summarize(student.id) }));
}
