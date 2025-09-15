//// hooks/useIsDisabled.ts
//import { useMemo } from "react";
//
//export const useIsDisabled = ({
//  account,
//  pendingTx,
//  isAwaitingRoundStateUpdate,
//  roundState,
//  prevRoundState,
//  canSendFossilRequest,
//  canAuctionStart,
//  canAuctionEnd,
//  canRoundSettle,
//}: {
//  account: any;
//  pendingTx: string | undefined;
//  isAwaitingRoundStateUpdate: boolean;
//  roundState: string;
//  prevRoundState: string;
//  canSendFossilRequest: boolean;
//  canAuctionStart: boolean;
//  canAuctionEnd: boolean;
//  canRoundSettle: boolean;
//}) => {
//  return useMemo(() => {
//    if (!account) return true;
//    if (roundState === "Pending") return true;
//    if (pendingTx) return true;
//    if (isAwaitingRoundStateUpdate) return true;
//    //if (prevRoundState !== roundState) return true;
//    if (roundState === "FossilReady") return !canSendFossilRequest;
//    if (roundState === "Open") return !canAuctionStart;
//    if (roundState === "Auctioning") return !canAuctionEnd;
//    if (roundState === "Running") return !canRoundSettle;
//    return false;
//  }, [
//    account,
//    pendingTx,
//    isAwaitingRoundStateUpdate,
//    roundState,
//    prevRoundState,
//    canSendFossilRequest,
//    canAuctionStart,
//    canAuctionEnd,
//    canRoundSettle,
//  ]);
//};
