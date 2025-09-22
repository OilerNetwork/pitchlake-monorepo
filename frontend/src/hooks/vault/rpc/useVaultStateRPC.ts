import { useReadContract } from "@starknet-react/core";
import { optionRoundABI, vaultABI } from "@/lib/abi";
import { VaultStateType } from "@/lib/types";
import { stringToHex } from "@/lib/utils";
import { useMemo } from "react";
import { BlockTag } from "starknet";

const useVaultStateRPC = ({
  vaultAddress,
  selectedRound,
}: {
  vaultAddress?: string;
  selectedRound?: number;
}) => {
  const contractData = useMemo(() => {
    return {
      abi: vaultABI,
      address: vaultAddress as `0x${string}`,
    };
  }, [vaultAddress]);

  //Read States

  //States without a param
  const { data: alpha } = useReadContract({
    ...contractData,
    functionName: "get_alpha",
    args: [],
    watch: true,
  });
  console.log("alpha", alpha);
  const { data: strikeLevel } = useReadContract({
    ...contractData,

    functionName: "get_strike_level",
    args: [],
    watch: true,
  });
  const { data: ethAddress } = useReadContract({
    ...contractData,

    functionName: "get_eth_address",
    args: [],
    watch: true,
  });
  // const { data: l1DataProcessorAddress } = useReadContract({
  //   ...contractData,

  //   functionName: "get_l1_data_processor_address",
  //   args: [],
  //   watch: true,
  // });
  const { data: currentRoundId } = useReadContract({
    ...contractData,

    functionName: "get_current_round_id",
    args: [],
    watch: true,
    blockIdentifier:BlockTag.PENDING
  });
  const { data: lockedBalance } = useReadContract({
    ...contractData,
    functionName: "get_vault_locked_balance",
    args: [],
    watch: true,
    blockIdentifier:BlockTag.PENDING
  });
  const { data: unlockedBalance } = useReadContract({
    ...contractData,

    functionName: "get_vault_unlocked_balance",
    args: [],
    watch: true,
    blockIdentifier:BlockTag.PENDING
  });
  const { data: stashedBalance } = useReadContract({
    ...contractData,

    functionName: "get_vault_stashed_balance",
    args: [],
    watch: true,
    blockIdentifier:BlockTag.PENDING
  });
  const { data: queuedBps } = useReadContract({
    ...contractData,

    functionName: "get_vault_queued_bps",
    args: [],
    watch: true,
    blockIdentifier:BlockTag.PENDING
  });

  const { data: round1Address } = useReadContract({
    ...contractData,

    functionName: "get_round_address",
    args: [1],
    watch: false,
    blockIdentifier:BlockTag.PENDING
  });

  const { data: deploymentDate } = useReadContract({
    ...contractData,
    address: round1Address?.toString()as `0x${string}`,

    abi: optionRoundABI,
    functionName: "get_deployment_date",
    args: [],
    watch: true,
  });
  const { data: selectedRoundAddress } = useReadContract({
    ...contractData,

    functionName: "get_round_address",
    args:
      selectedRound && selectedRound !== 0
        ? [Number(selectedRound.toString())]
        : undefined,
    watch: true,
  });
  const { data: currentRoundAddress } = useReadContract({
    ...contractData,

    functionName: "get_round_address",
    args: currentRoundId ? [BigInt(currentRoundId?.toString())] : [1],
    watch: true,
  });
  const usableStringSelectedRoundAddress = useMemo(() => {
    return stringToHex(selectedRoundAddress?.toString());
  }, [selectedRoundAddress]);
  const usableStringCurrentRoundAddress = useMemo(() => {
    return stringToHex(currentRoundAddress?.toString());
  }, [currentRoundAddress]);

  const k = useMemo(
    () => (strikeLevel ? Number(strikeLevel.toString()) : 0),
    [strikeLevel],
  );
  const vaultType = useMemo(
    () => (k > 0 ? "OTM" : k == 0 ? "ATM" : "ITM"),
    [k],
  );

  return {
    vaultState: {
      address: vaultAddress,
      alpha: alpha ? alpha.toString() : 0,
      strikeLevel: strikeLevel ? strikeLevel.toString() : 0,
      ethAddress: ethAddress ? stringToHex(ethAddress?.toString()) : "",
      l1DataProcessorAddress: "",
      currentRoundId: currentRoundId ? currentRoundId.toString() : 0,
      lockedBalance: lockedBalance ? lockedBalance.toString() : 0,
      unlockedBalance: unlockedBalance ? unlockedBalance.toString() : 0,
      stashedBalance: stashedBalance ? stashedBalance.toString() : 0,
      queuedBps: queuedBps ? queuedBps.toString() : 0,
      vaultType,
      deploymentDate: deploymentDate ? deploymentDate.toString() : 0,
      currentRoundAddress: usableStringCurrentRoundAddress,
    } as VaultStateType,
    selectedRoundAddress: usableStringSelectedRoundAddress,
  };
};

export default useVaultStateRPC;
