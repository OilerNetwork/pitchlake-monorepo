import { useEffect, useRef, useState } from "react";
import {
  VaultStateType,
  OptionRoundStateType,
  LiquidityProviderStateType,
  OptionBuyerStateType,
  Bid,
} from "@/lib/types";
import { useAccount } from "@starknet-react/core";
import { getPerformanceLP, getPerformanceOB, removeLeadingZeroes } from "@/lib/utils";

type InitialPayload = {
  payloadType: string;
  liquidityProviderState?: LiquidityProviderStateType;
  optionBuyerStates?: OptionBuyerStateType[];
  vaultState?: VaultStateType;
  optionRoundStates?: OptionRoundStateType[];
};

type NotificationPayload = {
  operation: string;
  type: string;
  payload:
    | LiquidityProviderStateType
    | OptionBuyerStateType
    | VaultStateType
    | OptionRoundStateType
    | Bid;
};

const useWebSocketVault = (conn: string, vaultAddress?: string) => {
  const [wsVaultState, setWsVaultState] = useState<
    VaultStateType | undefined
  >();
  const [wsOptionRoundStates, setWsOptionRoundStates] = useState<
    OptionRoundStateType[]
  >([]);
  const [wsLiquidityProviderState, setWsLiquidityProviderState] = useState<
    LiquidityProviderStateType | undefined
  >();
  const [wsOptionBuyerStates, setWsOptionBuyerStates] = useState<
    OptionBuyerStateType[] | null
  >(null);
  const ws = useRef<WebSocket | null>(null);
  const { address } = useAccount();
  const accountAddress=address?removeLeadingZeroes(address):undefined
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (conn === "ws" && isLoaded && vaultAddress) {
      ws.current = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/subscribeVault`,
      );

      ws.current.onopen = () => {
        console.log("WebSocket connection established");
        ws.current?.send(
          JSON.stringify({
            address: accountAddress,
            userType: "ob", // Adjust based on your logic
            vaultAddress: removeLeadingZeroes(vaultAddress),
          })

        );
      };

      ws.current.onmessage = (event: MessageEvent) => {
        const wsResponse = JSON.parse(event.data);
        if (wsResponse.payloadType === "initial") {
          handleInitialPayload(wsResponse as InitialPayload);
          return;
        }

        if (wsResponse.payloadType === "account_update") {
          handleAccountUpdate(wsResponse as InitialPayload);
        }
        if (wsResponse.operation) {
          handleNotificationPayload(wsResponse as NotificationPayload);
        }
      };

      ws.current.onerror = (error: Event) => {
        console.error("WebSocket error:", error);
      };

      ws.current.onclose = () => {
        console.log("WebSocket connection closed");
      };
    } else {
      ws.current = null;
    }

    return () => {
      ws.current?.close();
    };
  }, [conn, isLoaded, vaultAddress]);

  useEffect(() => {
    if (ws.current?.readyState === 1)
      try {
        ws.current?.send(
          JSON.stringify({
            updatedField: "address",
            updatedValue: accountAddress,
          }),
        );
      } catch (err) {
        console.log(err);
      }
  }, [accountAddress]);

  const updateRound =
    (operation: string) => (updatedRound: OptionRoundStateType) => {
      if (operation === "insert")
        setWsOptionRoundStates((prevStates) => {
          return [...prevStates, updatedRound];
        });
      if (operation === "update")
        setWsOptionRoundStates((prevStates) => {
          const newStates = prevStates;
          if (updatedRound.address) {
            const updatedRoundIndex = Number(updatedRound.roundId) - 1;
            newStates[updatedRoundIndex] = updatedRound;
          }
          return newStates;
        });
    };

  const updateBuyer = (payload: OptionBuyerStateType) => {
    setWsOptionBuyerStates((states) => {
      const newStates = states
        ? states.map((state) => {
            const newState = state;
            if (state.roundAddress === payload.roundAddress) {
              return payload;
            }
            return newState;
          })
        : null;
      return newStates;
    });
  };

  const updateBid = (operation: string) => (payload: Bid) => {
    setWsOptionBuyerStates((states) => {
      const newStates = states
        ? states.map((state) => {
            const newState = state;
            if (state.roundAddress === payload.roundAddress) {
              if (operation === "insert") {
                const bids = state.bids?.map((bid: Bid) => {
                  if (bid.bidId === payload.bidId) return payload;
                  return bid;
                });
                newState.bids = bids;
              }
              if (operation === "update")
                newState.bids = [...newState.bids, payload];
            }
            return newState;
          })
        : null;

      return newStates;
    });
  };

  const handleAccountUpdate = (wsResponse: InitialPayload) => {
    if (wsResponse.liquidityProviderState?.address)
      setWsLiquidityProviderState(wsResponse.liquidityProviderState);
    else {
      setWsLiquidityProviderState(undefined);
    }
    if (wsResponse.optionBuyerStates?.length)
      setWsOptionBuyerStates(wsResponse.optionBuyerStates);
    else {
      setWsOptionBuyerStates([]);
    }
  };
  const handleInitialPayload = (wsResponse: InitialPayload) => {
    setWsVaultState(wsResponse.vaultState);
    const roundStates = wsResponse.optionRoundStates?.map((state) => {
      return {
        ...state,
        performanceLP: getPerformanceLP(
          state.soldLiquidity,
          state.premiums,
          state.totalPayout,
        ),
        performanceOB: getPerformanceOB(state.premiums, state.totalPayout),
      } as OptionRoundStateType;
    });
    setWsOptionRoundStates(roundStates ?? []);
    setWsLiquidityProviderState(
      wsResponse.liquidityProviderState?.address
        ? wsResponse.liquidityProviderState
        : undefined,
    );
    setWsOptionBuyerStates(wsResponse.optionBuyerStates ?? []);
  };

  const handleNotificationPayload = (wsResponse: NotificationPayload) => {
    if (wsResponse.type === "lpState") {
      const payload = wsResponse.payload as LiquidityProviderStateType;
      if (payload?.address) setWsLiquidityProviderState(payload);
      else {
        setWsLiquidityProviderState(undefined);
      }
    } else if (wsResponse.type === "bid" && wsResponse.operation) {
      updateBid(wsResponse.operation)(wsResponse.payload as Bid);
    } else if (wsResponse.type === "optionRoundState" && wsResponse.operation) {
      updateRound(wsResponse.operation)(
        wsResponse.payload as OptionRoundStateType,
      );
    } else if (wsResponse.type === "optionBuyerState") {
      updateBuyer(wsResponse.payload as OptionBuyerStateType);
    } else if (wsResponse.type === "vaultState") {
      const payload = wsResponse.payload as VaultStateType;
      setWsVaultState(payload);
    }
  };
  return {
    wsVaultState,
    wsOptionRoundStates,
    wsLiquidityProviderState,
    wsOptionBuyerStates: wsOptionBuyerStates ?? [],
  };
};

export default useWebSocketVault;
