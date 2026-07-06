import { useEffect, useState } from "react";
import { getAccessStatus, getCurrentStudent, isAdmin, isAuthResolved, subscribeRewards, type AccessStatus, type Student } from "./progress";

export interface CurrentStudentState {
  student: Student | null;
  access: AccessStatus | null;
  isAdmin: boolean;
  /** true trong khoảnh khắc đầu tiên Firebase còn đang kiểm tra phiên đăng
   * nhập cũ — tránh nhấp nháy màn hình đăng nhập cho người đã đăng nhập rồi. */
  loading: boolean;
}

function readState(): CurrentStudentState {
  return {
    student: getCurrentStudent(),
    access: getAccessStatus(),
    isAdmin: isAdmin(),
    loading: !isAuthResolved(),
  };
}

export function useCurrentStudent(): CurrentStudentState {
  const [state, setState] = useState<CurrentStudentState>(readState);

  useEffect(() => {
    return subscribeRewards(() => setState(readState()));
  }, []);

  return state;
}
