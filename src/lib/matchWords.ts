// Căn chỉnh (alignment) chuỗi từ mong đợi với transcript nhận diện được từ
// giọng nói, để biết từng từ trong câu mẫu được đọc đúng/sai/thiếu.
// Dùng thuật toán edit-distance (Levenshtein) trên mảng từ, có backtrace.

export type WordMatchStatus = "correct" | "incorrect";

export interface WordMatchResult {
  index: number;
  status: WordMatchStatus;
  heard?: string;
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z']/g, "");
}

export function alignTranscript(expectedWords: string[], transcriptWords: string[]): WordMatchResult[] {
  const exp = expectedWords.map(normalizeToken);
  const heard = transcriptWords.map(normalizeToken).filter(Boolean);

  const n = exp.length;
  const m = heard.length;

  if (m === 0) {
    return exp.map((_, index) => ({ index, status: "incorrect" as const }));
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const substCost = exp[i - 1] === heard[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + substCost, // match/substitute
        dp[i - 1][j] + 1, // expected word missing from speech
        dp[i][j - 1] + 1 // extra spoken word, ignored
      );
    }
  }

  const results: WordMatchResult[] = new Array(n);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const substCost = i > 0 && j > 0 ? (exp[i - 1] === heard[j - 1] ? 0 : 1) : Infinity;
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + substCost) {
      results[i - 1] = {
        index: i - 1,
        status: exp[i - 1] === heard[j - 1] ? "correct" : "incorrect",
        heard: heard[j - 1],
      };
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      results[i - 1] = { index: i - 1, status: "incorrect" };
      i--;
    } else {
      j--;
    }
  }

  return results;
}
