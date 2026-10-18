"use client";

import { useState } from "react";
import { UserGoalItem } from "../components/SetupGoalsStep";

interface PoolItem {
  id: string;
  name: string;
  currentBalance?: number;
  isSurplusTarget?: boolean;
}

export function useSetupSweepQueue(
  pools: PoolItem[],
  setGoals: React.Dispatch<React.SetStateAction<UserGoalItem[]>>
) {
  const [sweepQueue, setSweepQueue] = useState<Array<{ poolId: string; sweepDestinationPoolId?: string | null }>>([]);
  const [activeSweepPool, setActiveSweepPool] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [selectedSweepDest, setSelectedSweepDest] = useState<string>("");

  const handleRemoveGoal = (id: string) => {
    const existingPool = pools.find((p) => p.id === id);
    const balance = existingPool?.currentBalance || 0;
    if (balance > 0.005) {
      setActiveSweepPool({ id, name: existingPool?.name || "Goal", balance });
      const availableDests = pools.filter((p) => p.id !== id);
      const defaultDest = availableDests.find((p) => p.isSurplusTarget)?.id || availableDests[0]?.id || "";
      setSelectedSweepDest(defaultDest);
    } else {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      if (!id.startsWith("g-")) {
        setSweepQueue((prev) => [...prev, { poolId: id }]);
      }
    }
  };

  const confirmSweepAndRemove = () => {
    if (!activeSweepPool) return;
    setSweepQueue((prev) => [...prev, { poolId: activeSweepPool.id, sweepDestinationPoolId: selectedSweepDest }]);
    setGoals((prev) => prev.filter((g) => g.id !== activeSweepPool.id));
    setActiveSweepPool(null);
  };

  return {
    sweepQueue,
    activeSweepPool,
    setActiveSweepPool,
    selectedSweepDest,
    setSelectedSweepDest,
    handleRemoveGoal,
    confirmSweepAndRemove,
  };
}
