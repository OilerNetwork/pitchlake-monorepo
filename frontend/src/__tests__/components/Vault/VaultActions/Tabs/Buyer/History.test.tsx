import React, { ReactNode } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import History from "@/components/Vault/VaultActions/Tabs/Buyer/History";
import { useExplorer, useAccount } from "@starknet-react/core";
import { useTransactionContext } from "@/context/TransactionProvider";
import TransactionProvider from "@/context/TransactionProvider";
import { useHelpContext } from "@/context/HelpProvider";
import { HelpProvider } from "@/context/HelpProvider";
import { formatUnits } from "ethers";
import useOptionBuyerStateRPC from "@/hooks/vault_v2/rpc/useOptionBuyerStateRPC";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import { useNewContext } from "@/context/NewProvider";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import { useTimeContext } from "@/context/TimeProvider";
import useErc20Balance from "@/hooks/erc20/useErc20Balance";
import useErc20Allowance from "@/hooks/erc20/useErc20Allowance";
import useEditBidMulticall from "@/hooks/txn/useEditBidMulticall";
import useOBState from "@/hooks/vault_v2/states/useOBState";
import {
  VaultStateType,
  VaultActionsType,
  OptionRoundStateType,
  LiquidityProviderStateType,
  OptionBuyerStateType,
} from "@/lib/types";

interface HistoryProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
  setIsShowingTabs: (showing: boolean) => void;
}

// Configure mocks
const mockConfig = {
  hooks: {
    explorer: {
      transaction: (hash: string) => `https://testnet.starkscan.co/tx/${hash}`,
      getTransactionUrl: (hash: string) =>
        `https://testnet.starkscan.co/tx/${hash}`,
      getAddressUrl: (address: string) =>
        `https://testnet.starkscan.co/contract/${address}`,
      contract: (address: string) =>
        `https://testnet.starkscan.co/contract/${address}`,
    },
    account: {
      account: { address: "0x123" },
    },
    transaction: {
      isTxDisabled: false,
      pendingTx: "0x123",
      setIsTxDisabled: jest.fn(),
      setPendingTx: jest.fn(),
      status: "success" as const,
      statusModalProps: {
        version: null,
        txnHeader: "",
        txnHash: "",
        txnOutcome: "",
      },
      setStatusModalProps: jest.fn(),
      updateStatusModalProps: jest.fn(),
      modalState: {
        show: false,
        type: "confirmation" as const,
        modalHeader: "",
        action: "",
        onConfirm: async () => {},
      },
      setModalState: jest.fn(),
    },
    help: {
      isHelpBoxOpen: false,
      toggleHelpBoxOpen: jest.fn(),
      content: "",
      header: "",
      setActiveDataId: jest.fn(),
      clearContent: jest.fn(),
    },
    optionBuyer: {
      bids: [
        {
          bid_id: "1",
          amount: "1000000000",
          price: "500000000000000", // 0.5 GWEI in Wei
          roundState: "Auctioning",
        },
        {
          bid_id: "2",
          amount: "2000000000",
          price: "1000000000000000", // 1 GWEI in Wei
          roundState: "Auctioning",
        },
      ],
    },
    optionRound: {
      editBid: jest.fn(),
      cancelBid: jest.fn(),
    },
    roundState: {
      roundState: "Auctioning",
    },
    vaultState: {
      selectedRoundAddress: "0x123",
      vaultState: {
        ethAddress: "0x123",
      },
    },
    time: {
      timestamp: 1234567890,
    },
    erc20Balance: {
      balance: BigInt("1000000000000000000"), // 1 ETH
    },
    erc20Allowance: {
      allowance: BigInt("1000000000000000000"), // 1 ETH
    },
    editBidMulticall: {
      handleMulticall: jest.fn(),
    },
    obState: {
      bids: [
        {
          bid_id: "1",
          amount: "1000000000",
          price: "500000000000000", // 0.5 GWEI in Wei
          roundState: "Auctioning",
        },
        {
          bid_id: "2",
          amount: "2000000000",
          price: "1000000000000000", // 1 GWEI in Wei
          roundState: "Auctioning",
        },
      ],
    },
    newContext: {
      conn: "rpc",
      vaultAddress: "0x123",
      selectedRound: 1,
      setSelectedRound: jest.fn(),
      setVaultAddress: jest.fn(),
      wsData: {
        wsVaultState: {
          address: "0x123",
          vaultType: "test",
          alpha: "1000000000000000000",
          strikeLevel: "1000000000000000000",
          ethAddress: "0x123",
          l1DataProcessorAddress: "0x123",
          currentRoundId: "1",
          lockedBalance: "0",
          unlockedBalance: "0",
          stashedBalance: "0",
          queuedBps: "0",
          now: "0",
          deploymentDate: "0",
          currentRoundAddress: "0x123",
        },
        wsLiquidityProviderState: {
          address: "0x123",
          lockedBalance: "0",
          unlockedBalance: "0",
          stashedBalance: "0",
          queuedBps: "0",
        },
        wsOptionBuyerStates: [],
        wsOptionRoundStates: [],
      },
      mockData: {
        vaultState: {
          address: "0x123",
          vaultType: "test",
          alpha: "1000000000000000000",
          strikeLevel: "1000000000000000000",
          ethAddress: "0x123",
          l1DataProcessorAddress: "0x123",
          currentRoundId: "1",
          lockedBalance: "0",
          unlockedBalance: "0",
          stashedBalance: "0",
          queuedBps: "0",
          now: "0",
          deploymentDate: "0",
          currentRoundAddress: "0x123",
        },
        lpState: {
          address: "0x123",
          lockedBalance: "0",
          unlockedBalance: "0",
          stashedBalance: "0",
          queuedBps: "0",
        },
        optionBuyerStates: [],
        optionRoundStates: [],
      },
    },
  },
  utils: {
    formatUnits: (value: string | number | bigint, decimals: number) => {
      return Number(value) / Math.pow(10, decimals);
    },
  },
};

// Mock modules
jest.mock("@starknet-react/core", () => ({
  useExplorer: jest.fn(() => mockConfig.hooks.explorer),
  useAccount: jest.fn(() => mockConfig.hooks.account),
  useContractRead: jest.fn(() => ({
    data: "1000000000000000000", // 1 ETH in Wei
    isLoading: false,
    error: null,
  })),
}));

jest.mock("@/context/TransactionProvider", () => ({
  __esModule: true,
  useTransactionContext: jest.fn(() => mockConfig.hooks.transaction),
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="transaction-provider">{children}</div>
  ),
}));

jest.mock("@/context/HelpProvider", () => ({
  __esModule: true,
  useHelpContext: jest.fn(() => mockConfig.hooks.help),
  HelpProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="help-provider">{children}</div>
  ),
}));

jest.mock("@/context/NewProvider", () => ({
  useNewContext: jest.fn(() => mockConfig.hooks.newContext),
}));

jest.mock("@/hooks/vault_v2/rpc/useOptionBuyerStateRPC", () => ({
  __esModule: true,
  default: jest.fn(() => mockConfig.hooks.optionBuyer),
}));

jest.mock("@/hooks/vault_v2/actions/useVaultActions", () => ({
  __esModule: true,
  default: jest.fn(() => mockConfig.hooks.optionRound),
}));

jest.mock("@/hooks/vault_v2/states/useRoundState", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    roundState: "Auctioning",
    auctionEndDate: "9999999999",
  })),
}));

jest.mock("@/hooks/vault_v2/states/useVaultState", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    selectedRoundAddress: "0x123",
    vaultState: {
      ethAddress: "0x123",
      address: "0x123",
    },
  })),
}));

jest.mock("@/hooks/vault_v2/states/useOBState", () => {
  const mockOBState = jest.fn();
  mockOBState.mockReturnValue({
    bids: [
      {
        bid_id: "1",
        amount: "1000000000",
        price: "500000000000000", // 0.5 GWEI in Wei
        roundState: "Auctioning",
      },
      {
        bid_id: "2",
        amount: "2000000000",
        price: "1000000000000000", // 1 GWEI in Wei
        roundState: "Auctioning",
      },
    ],
  });
  return {
    __esModule: true,
    default: mockOBState,
  };
});

jest.mock("@/hooks/txn/useEditBidMulticall", () => ({
  __esModule: true,
  default: jest.fn(() => mockConfig.hooks.editBidMulticall),
}));

jest.mock("ethers", () => ({
  formatUnits: (value: string | number | bigint, unit: string | number) => {
    const decimals =
      typeof unit === "string" ? (unit === "gwei" ? 9 : 18) : unit;
    return Number(value) / Math.pow(10, decimals);
  },
  parseUnits: (value: string | number, unit: string | number) => {
    const decimals =
      typeof unit === "string" ? (unit === "gwei" ? 9 : 18) : unit;
    return BigInt(Math.floor(Number(value) * Math.pow(10, decimals)));
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <div data-testid="help-provider">
      <div data-testid="transaction-provider">{ui}</div>
    </div>,
  );
};

describe("History Component", () => {
  const showConfirmation = jest.fn();
  const setIsShowingTabs = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();

    // Reset mock implementations to ensure consistent state
    (useOBState as jest.Mock).mockReturnValue({
      bids: [
        {
          bid_id: "1",
          amount: "1000000000",
          price: "500000000000000", // 0.5 GWEI in Wei
          roundState: "Auctioning",
        },
        {
          bid_id: "2",
          amount: "2000000000",
          price: "1000000000000000", // 1 GWEI in Wei
          roundState: "Auctioning",
        },
      ],
    });

    (useVaultState as jest.Mock).mockReturnValue({
      selectedRoundAddress: "0x123",
      vaultState: {
        ethAddress: "0x123",
        address: "0x123",
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders history items correctly", () => {
    const { container } = render(
      <HelpProvider>
        <TransactionProvider>
          <History
            showConfirmation={showConfirmation}
            setIsShowingTabs={setIsShowingTabs}
          />
        </TransactionProvider>
      </HelpProvider>,
    );

    expect(
      screen.getByText(/1.0b options at 500000 GWEI each/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2.0b options at 1000000 GWEI each/i),
    ).toBeInTheDocument();
  });

  it("shows edit button only when roundState is Auctioning", () => {
    render(
      <HelpProvider>
        <TransactionProvider>
          <History
            showConfirmation={showConfirmation}
            setIsShowingTabs={setIsShowingTabs}
          />
        </TransactionProvider>
      </HelpProvider>,
    );

    const editButtons = screen.getAllByRole("button", { name: /edit bid/i });
    expect(editButtons.length).toBe(2);
  });

  it("calls setBidToEdit and setIsTabsHidden when edit button is clicked", () => {
    render(
      <HelpProvider>
        <TransactionProvider>
          <History
            showConfirmation={showConfirmation}
            setIsShowingTabs={setIsShowingTabs}
          />
        </TransactionProvider>
      </HelpProvider>,
    );

    const editButtons = screen.getAllByRole("button", { name: /edit bid/i });
    fireEvent.click(editButtons[0]);

    expect(setIsShowingTabs).toHaveBeenCalledWith(false);
  });

  it("handles empty history items array", () => {
    // Override the default mock for this specific test
    (useOBState as jest.Mock).mockReturnValue({
      bids: [],
    });

    render(
      <HelpProvider>
        <TransactionProvider>
          <History
            showConfirmation={showConfirmation}
            setIsShowingTabs={setIsShowingTabs}
          />
        </TransactionProvider>
      </HelpProvider>,
    );

    expect(
      screen.queryByRole("button", { name: /edit bid/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/options at/)).not.toBeInTheDocument();
    expect(screen.getByText(/No Bids/)).toBeInTheDocument();
  });

  it("applies correct styling to history items", () => {
    render(
      <HelpProvider>
        <TransactionProvider>
          <History
            showConfirmation={showConfirmation}
            setIsShowingTabs={setIsShowingTabs}
          />
        </TransactionProvider>
      </HelpProvider>,
    );

    const bidItems = document.getElementsByClassName("bid-item");
    expect(bidItems.length).toBe(2);

    expect(bidItems[0]).toHaveClass("border-b");
    expect(bidItems[1]).not.toHaveClass("border-b");

    const bidDetails = document.getElementsByClassName("bid-item-details");
    expect(bidDetails[0].textContent).toMatch(
      /1.0b options at 500000 GWEI each/i,
    );
    expect(bidDetails[1].textContent).toMatch(
      /2.0b options at 1000000 GWEI each/i,
    );
  });
});
