import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PanelRight from "../../../components/Vault/PanelRight";
import { useTransactionContext } from "../../../context/TransactionProvider";
import { useAccount } from "@starknet-react/core";
import { useTabContent } from "../../../hooks/vault/useTabContent";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";

jest.mock("../../../context/TransactionProvider", () => ({
  __esModule: true,
  useTransactionContext: jest.fn(),
}));

jest.mock("@starknet-react/core", () => ({
  __esModule: true,
  useAccount: jest.fn(),
  useContractRead: jest.fn().mockReturnValue({
    data: "1000000000000000000",
    isError: false,
    isLoading: false,
  }),
}));

jest.mock("../../../hooks/vault/useTabContent", () => ({
  __esModule: true,
  useTabContent: jest.fn(),
}));

jest.mock("@/hooks/vault_v2/states/useVaultState", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    vaultState: {
      address: "0x123",
      currentRoundId: "1",
    },
    selectedRoundAddress: "0x456",
  }),
}));

jest.mock("@/hooks/vault_v2/states/useRoundState", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    roundId: "1",
    startTimestamp: "1000",
    duration: "1000",
    roundState: "Auctioning",
  }),
}));

jest.mock("@/context/NewProvider", () => ({
  __esModule: true,
  useNewContext: jest.fn().mockReturnValue({
    conn: "rpc",
    wsData: {
      wsOptionBuyerStates: [],
    },
    mockData: {
      optionBuyerStates: [],
    },
  }),
}));

jest.mock("@/hooks/vault_v2/rpc/useOptionBuyerStateRPC", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(null),
}));

// Mock child components
jest.mock("../../../components/Vault/VaultActions/Tabs/Tabs", () => ({
  __esModule: true,
  default: ({
    tabs,
    activeTab,
    setActiveTab,
  }: {
    tabs: string[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
  }) => (
    <div className="vault-tabs">
      {tabs.map((tab: string) => (
        <button
          key={tab}
          className={`vault-tab ${activeTab === tab ? "active" : ""}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../../../components/Vault/Utils/ConfirmationModal", () => ({
  __esModule: true,
  default: jest.fn(() => <div>Mock Confirmation Modal</div>),
}));

jest.mock("../../../components/Vault/Utils/TxnSuccess", () => ({
  __esModule: true,
  default: jest.fn(() => <div>Mock Success Modal</div>),
}));

jest.mock("../../../components/Vault/VaultActions/Tabs/Buyer/EditBid", () => ({
  __esModule: true,
  default: jest.fn(() => <div>Mock Edit Bid Modal</div>),
}));

describe("PanelRight Component", () => {
  const mockSelectedRoundState = {
    roundState: "Open",
    roundId: "1",
  };

  const mockSelectedRoundBuyerState = {
    bids: [],
  };

  const mockTabs = ["Deposit", "Withdraw"];
  const mockTabContent = <div className="tab-content">Mock Tab Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();

    (useTransactionContext as jest.Mock).mockReturnValue({
      pendingTx: false,
      modalState: {
        show: false,
        type: "confirmation",
        modalHeader: "mock header",
        action: <div>mock action</div>,
        onConfirm: () => {},
      },
      statusModalProps: {
        version: null,
        txnHeader: "mock success header",
        txnHash: "0xasdf",
        txnOutcome: <div>mock success outcome</div>,
      },
    });

    (useAccount as jest.Mock).mockReturnValue({
      address: "0x123",
      account: {
        address: "0x123",
      },
    });

    (useTabContent as jest.Mock).mockReturnValue({
      tabs: ["Tab1", "Tab2"],
      tabContent: <div className="tab-content">Tab Content</div>,
    });
  });

  it("renders with initial state", () => {
    render(<PanelRight userType="lp" />);

    expect(screen.getByText("Tab1")).toBeInTheDocument();
    expect(screen.getByText("Tab2")).toBeInTheDocument();
    expect(screen.getByText("Tab Content")).toBeInTheDocument();
  });

  it("handles tab changes", () => {
    render(<PanelRight userType="lp" />);

    const tab2Button = screen.getByText("Tab2");
    fireEvent.click(tab2Button);
    expect(tab2Button).toHaveClass("active");
  });

  it("renders NotStartedYet when no tabs are available", () => {
    (useTabContent as jest.Mock).mockReturnValue({
      tabs: [],
      tabContent: null,
    });

    render(<PanelRight userType="lp" />);

    expect(screen.getByText("Round In Process")).toBeInTheDocument();
    expect(
      screen.getByText(/This round has not started yet/),
    ).toBeInTheDocument();
  });

  it("updates active tab when round state changes", () => {
    const setIsEditOpen = jest.fn();
    const { rerender } = render(<PanelRight userType="lp" />);

    // Change round state and available tabs
    const newTabs = ["NewTab"];
    (useTabContent as jest.Mock).mockReturnValue({
      tabs: newTabs,
      tabContent: <div className="tab-content">New Tab Content</div>,
    });

    // Rerender to reflect changes
    rerender(<PanelRight userType="lp" />);

    const tabsContainer = screen.getByText("NewTab").closest(".vault-tabs");
    expect(tabsContainer).toBeInTheDocument();
    expect(screen.getByText("New Tab Content")).toBeInTheDocument();
  });
});

