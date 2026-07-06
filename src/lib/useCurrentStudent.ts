import { useEffect, useState } from "react";
import { getCurrentStudent, isAuthResolved, subscribeRewards, type Student } from "./progress";

export interface CurrentStudentState {
  student: Student | null;
  /** true trong khoảnh khắc đầu tiên Firebase còn đang kiểm tra phiên đăng
   * nhập cũ — tránh nhấp nháy màn hình đăng nhập cho người đã đăng nhập rồi. */
  loading: boolean;
}

export function useCurrentStudent(): CurrentStudentState {
  const [state, setState] = useState<CurrentStudentState>(() => ({
    student: getCurrentStudent(),
    loading: !isAuthResolved(),
  }));

  useEffect(() => {
    return subscribeRewards(() => setState({ student: getCurrentStudent(), loading: !isAuthResolved() }));
  }, []);

  return state;
}
