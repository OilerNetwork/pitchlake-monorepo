import { useAccount } from "@starknet-react/core";
import { useMemo, useState, useCallback, useEffect } from "react";
import { useTransactionContext } from "@/context/TransactionProvider";
import { getIconByRoundState } from "@/hooks/stateTransition/getIconByRoundState";
import Hoverable from "@/components/BaseComponents/Hoverable";
import useVaultState from "@/hooks/vault/states/useVaultState";
import useRoundState from "@/hooks/vault/states/useRoundState";
import useVaultActions from "@/hooks/vault/actions/useVaultActions";
import { useTimeContext } from "@/context/TimeProvider";
import { useNewContext } from "@/context/NewProvider";
import { useProgressEstimates } from "@/hooks/stateTransition/useProgressEstimates";
import { sendFossilRequest } from "@/services/fossilRequest";

const ManualButtons = ({
  isPanelOpen,
  setModalState,
}: {
  isPanelOpen: boolean;
  setModalState: any;
}) => {
  const { vaultState, selectedRoundAddress } = useVaultState();
  const { pendingTx } = useTransactionContext();
  const { account } = useAccount();
  const { timestamp } = useTimeContext();
  const { conn } = useNewContext();
  const vaultActions = useVaultActions();
  const selectedRoundState = useRoundState(selectedRoundAddress);
  const { totalEstimate } = useProgressEstimates();

  const [expectedNextState, setExpectedNextState] = useState<string | null>(
    null,
  );

  const {
    isDisabled,
    roundState,
  }: { isDisabled: boolean; roundState: string } = useMemo(() => {
    if (!selectedRoundState || !timestamp || !vaultState)
      return { isDisabled: true, roundState: "Settled" };

    if (pendingTx) return { isDisabled: true, roundState: "Pending" };

    if (
      expectedNextState &&
      expectedNextState !== selectedRoundState.roundState
    ) {
      return { isDisabled: true, roundState: "Pending" };
    }

    const {
      roundState,
      auctionStartDate,
      auctionEndDate,
      optionSettleDate,
      deploymentDate,
      reservePrice,
    } = selectedRoundState;

    if (!account) return { isDisabled: true, roundState };

    // Exit early if round settled
    if (roundState === "Settled") return { isDisabled: true, roundState };

    const targetTimestamp =
      roundState === "Open" && Number(reservePrice) === 0
        ? Number(deploymentDate)
        : roundState === "Open"
          ? Number(auctionStartDate)
          : roundState === "Auctioning"
            ? Number(auctionEndDate)
            : conn !== "demo"
              ? Number(optionSettleDate)
              : optionSettleDate;

    if (Number(timestamp) < Number(targetTimestamp))
      return { isDisabled: true, roundState };

    return { isDisabled: false, roundState };
  }, [
    account,
    pendingTx,
    selectedRoundState,
    timestamp,
    expectedNextState,
    conn,
    vaultState,
  ]);

  const handleAction = useCallback(async () => {
    if (!account || !vaultState || !selectedRoundState) return;

    if (roundState === "Open") {
      if (Number(selectedRoundState.reservePrice) === 0) {
        // Round 1 initialization case
        try {
          const response = await sendFossilRequest(
            vaultState.jobRequestInitRound1,
            conn,
            vaultState.address,
          );
          if (response === "Ok") setExpectedNextState("Auctioning");
          else setExpectedNextState(null);
        } catch (error) {
          console.error(error);
          setExpectedNextState(null);
        }
      } else {
        try {
          await vaultActions.startAuction();
          setExpectedNextState("Auctioning");
        } catch (error) {
          console.error(error);
          setExpectedNextState(null);
        }
      }
    } else if (roundState === "Auctioning") {
      try {
        await vaultActions.endAuction();
        setExpectedNextState("Running");
      } catch (error) {
        console.error(error);
        setExpectedNextState(null);
      }
    } else if (roundState === "Running") {
      try {
        // Do demo fossil_client_callback
        if (conn === "demo") {
          const result = await vaultActions.demoFossilCallback({
            vaultAddress: vaultState.address,
            roundId: selectedRoundState.roundId.toString(),
            toTimestamp: selectedRoundState.optionSettleDate.toString(),
          });

          result ? setExpectedNextState("Settled") : setExpectedNextState(null);
        } // Do standard fossil request
        else {
          const response = await sendFossilRequest(
            vaultState.jobRequestSettleRound,
            conn,
            vaultState.address,
          );
          if (response === "Ok") setExpectedNextState("Settled");
          else setExpectedNextState(null);
        }
      } catch (error) {
        console.error(error);
        setExpectedNextState(null);
      }
    }

    setModalState((prev: any) => ({
      ...prev,
      show: false,
    }));
  }, [
    conn,
    roundState,
    account,
    vaultState?.address,
    selectedRoundState?.auctionStartDate,
    selectedRoundState?.roundState,
    selectedRoundState?.roundId,
    selectedRoundState?.auctionEndDate,
    selectedRoundState?.optionSettleDate,
    vaultActions,
  ]);

  const actions: Record<string, string> = useMemo(
    () => ({
      Open:
        Number(selectedRoundState?.reservePrice) === 0
          ? "Initialize Round"
          : "Start Auction",
      Auctioning: "End Auction",
      Running: "Settle Round",
      Pending: "Pending",
    }),
    [selectedRoundState?.reservePrice],
  );

  const icon = getIconByRoundState(roundState, isDisabled, isPanelOpen);

  useEffect(() => {
    if (expectedNextState && roundState === expectedNextState) {
      setExpectedNextState(null);
    }
  }, [roundState, expectedNextState]);

  if (
    !vaultState ||
    !selectedRoundState ||
    !roundState ||
    roundState === "Settled"
  )
    return null;

  return (
    <div>
      <Hoverable dataId="stateTransitionCronFail" className="px-2 p-2">
        {isPanelOpen && !expectedNextState && conn !== "demo" && (
          <div className="text-[#DA718C] px-2 pb-2">
            Something went wrong,
            {account ? " please manually " : " connect account to manually "}
            {roundState === "Open"
              ? Number(selectedRoundState?.reservePrice) === 0
                ? "initialize round 1."
                : "start the auction."
              : roundState === "Auctioning"
                ? "end the auction."
                : "settle the round."}
          </div>
        )}
        {isPanelOpen && !expectedNextState && conn === "demo" && !account && (
          <div className="text-[#DA718C] px-2 pb-2">
            Connect account to transition the state.{" "}
          </div>
        )}

        <button
          disabled={isDisabled}
          className={`flex ${!isPanelOpen && !isDisabled ? "hover-zoom-small" : ""} ${
            roundState === "Settled" ? "hidden" : ""
          } ${isPanelOpen ? "p-2" : "w-[44px] h-[44px]"} border border-greyscale-700 text-primary disabled:text-greyscale rounded-md justify-center items-center min-w-[44px] min-h-[44px] w-full`}
          onClick={() => {
            setModalState({
              show: true,
              action: actions[roundState],
              onConfirm: handleAction,
            });
          }}
        >
          <p className={`${isPanelOpen ? "" : "hidden"}`}>
            {actions[roundState]}
          </p>
          {icon}
        </button>
      </Hoverable>
    </div>
  );
};

export default ManualButtons;
