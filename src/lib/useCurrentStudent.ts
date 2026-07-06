import { useEffect, useState } from "react";
import { getCurrentStudent, subscribeRewards, type Student } from "./progress";

export function useCurrentStudent(): Student | null {
  const [student, setStudent] = useState<Student | null>(() => getCurrentStudent());

  useEffect(() => {
    return subscribeRewards(() => setStudent(getCurrentStudent()));
  }, []);

  return student;
}
