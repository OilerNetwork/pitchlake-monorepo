import { useEffect, useCallback, useState } from "react";
import {
  createJobId,
  getDurationForRound,
  getTargetTimestampForRound,
} from "@/lib/utils";
import useVaultState from "../vault_v2/states/useVaultState";
import useRoundState from "../vault_v2/states/useRoundState";
import { useNewContext } from "@/context/NewProvider";

export interface StatusData {
  status?: string;
  error?: string;
}

const useFossilStatus = () => {
  const { selectedRoundAddress, vaultState } = useVaultState();
  const selectedRoundState = useRoundState(selectedRoundAddress);
  const { conn } = useNewContext();
  const targetTimestamp = getTargetTimestampForRound(selectedRoundState);
  const roundDuration = getDurationForRound(selectedRoundState);
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    if (!selectedRoundState) return;
    if (targetTimestamp === 0) return;
    if (conn === "mock") {
      if (
        selectedRoundState.roundState === "FossilReady" ||
        selectedRoundState.roundState === "Running"
      ) {
        setStatusData({
          status: "Completed",
        } as StatusData);
      }
      return;
    }

    setLoading(true);
    try {
      const jobId = createJobId(
        targetTimestamp,
        roundDuration,
        Number(vaultState?.alpha || 0),
        Number(vaultState?.strikeLevel || 0),
      );
      const response = await fetch(`/api/getJobStatus?jobId=${jobId}`);
      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();
      setStatusData(data);
      setError(null);
    } catch (err) {
      setError("Error fetching job status");
    } finally {
      setLoading(false);
    }
  }, [targetTimestamp, vaultState?.alpha, vaultState?.strikeLevel, conn]);

  useEffect(() => {
    if (
      selectedRoundState?.roundState === "Auctioning" ||
      selectedRoundState?.roundState === "Settled"
    )
      return;

    const intervalId = setInterval(() => {
      fetchStatus();

      // Stop polling if status is "Completed"
      if (statusData?.status === "Completed") {
        clearInterval(intervalId);
      }
    }, 100000);

    // Fetch immediately on mount
    fetchStatus();

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchStatus, targetTimestamp, selectedRoundState?.roundState]);

  return { status: statusData, error, loading, setStatusData, fetchStatus };
};

export default useFossilStatus;
