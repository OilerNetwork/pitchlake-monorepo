import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect } from "react";
import { useProvider } from "@starknet-react/core";
import { useNewContext } from "@/context/NewProvider";

// Return type(s) for data and hook
export interface ReadVaultRoundsResponse {
  vaultAddress: string;
  currentRoundId: number;
  rounds: RoundData[];
}

export interface RoundData {
  roundId: number;
  roundAddress: string;
  capLevel: string;
  strikePrice: string;
  error?: string;
}

interface UseVaultRoundsResult {
  vaultData: ReadVaultRoundsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: any;
}

const fetchVaultRounds = async (
  vaultAddress: string | undefined,
  fromRound: number | undefined,
  toRound: number | undefined,
  nodeUrl: string | undefined,
): Promise<ReadVaultRoundsResponse> => {
  const response = await axios.get("/api/getHistoricalRoundParams", {
    params: {
      vaultAddress,
      fromRound,
      toRound,
      nodeUrl,
    },
  });
  return response.data;
};

export const useHistoricalRoundParams = ({
  vaultAddress,
  fromRound,
  toRound,
}: {
  vaultAddress: string | undefined;
  fromRound: number | undefined;
  toRound: number | undefined;
}): UseVaultRoundsResult => {
  // Query UID
  const { conn } = useNewContext();
  const queryKey = ["roundHistoricalData", vaultAddress, fromRound, toRound];
  const { provider } = useProvider();

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      fetchVaultRounds(
        vaultAddress,
        fromRound,
        toRound,
        conn === "demo" ? undefined : provider?.channel?.nodeUrl,
      ),
    enabled: !!vaultAddress && !!fromRound && !!toRound,
  });

  useEffect(() => {}, [vaultAddress, toRound, fromRound]);

  return {
    vaultData: data,
    isLoading,
    isError,
    error,
  };
};
