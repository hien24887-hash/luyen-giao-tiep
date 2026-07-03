import { useEffect, useState } from "react";
import { getRewards, subscribeRewards, type RewardTotals } from "./progress";

export function useRewards(): RewardTotals {
  const [rewards, setRewards] = useState<RewardTotals>(() => getRewards());

  useEffect(() => {
    const unsubscribe = subscribeRewards(() => setRewards(getRewards()));
    return unsubscribe;
  }, []);

  return rewards;
}
