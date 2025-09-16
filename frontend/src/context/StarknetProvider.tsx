"use client";
import React from "react";
import { sepolia, mainnet, devnet, Chain } from "@starknet-react/chains";
import {
  StarknetConfig,
  argent,
  ready,
  braavos,
  useInjectedConnectors,
  voyager,
  jsonRpcProvider,
} from "@starknet-react/core";
import { stringToHexString } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export const juno = {
  id: BigInt("0x534e5f4a554e4f5f53455155454e434552"), // SN_JUNO_SEQUENCER
  network: "juno",
  name: "Juno Devnet",
  nativeCurrency: {
    address:
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  testnet: true,
  paymasterRpcUrls: {
    default: {
      http: ["http://localhost:6060"],
    },
  },
  rpcUrls: {
    default: {
      http: [],
    },
    public: {
      http: ["http://localhost:6060"],
    },
  },
} as const satisfies Chain;

export const StarknetProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [ braavos(),argent()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: "onlyIfNoConnectors",
    // Randomize the order of the connectors.
    order: "alphabetical",
  });

  function rpc(chain: Chain) {
    switch (chain.network) {
      case "sepolia":
        return {
          nodeUrl: process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA,
        };
      case "devnet":
        return {
          nodeUrl: process.env.NEXT_PUBLIC_RPC_URL_DEVNET,
        };

      case "juno":
        return {
          nodeUrl: process.env.NEXT_PUBLIC_RPC_URL_JUNO_DEVNET,
        };

      case "mainnet":
        return {
          nodeUrl: process.env.NEXT_PUBLIC_RPC_URL_MAINNET,
        };
      default:
        return {
          nodeUrl: process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA,
        };
    }
  }
  const provider = jsonRpcProvider({ rpc });

  const queryClient = useQueryClient();
  const newDevnet = {...devnet, id: BigInt(stringToHexString("0x4b4154414e41"))}
  return (
    <StarknetConfig
      chains={[  newDevnet,sepolia, juno, mainnet,]}
      provider={provider}
      connectors={connectors}
      explorer={voyager}
      autoConnect={true}
      queryClient={queryClient}
    >
      {children}
    </StarknetConfig>
  );
};
