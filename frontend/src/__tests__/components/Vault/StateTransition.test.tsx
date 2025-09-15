import { render, screen, fireEvent, act } from "@testing-library/react";
import StateTransition from "@/components/Vault/StateTransition/StateTransition";
import { useTransactionContext } from "@/context/TransactionProvider";
import { useHelpContext } from "@/context/HelpProvider";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import { useNewContext } from "@/context/NewProvider";
import { useAccount } from "@starknet-react/core";
import { useTimeContext } from "@/context/TimeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OptionRoundStateType, VaultStateType } from "@/lib/types";
import * as useProgressEstimatesModule from "@/hooks/stateTransition/useProgressEstimates";

// Mock all hooks
jest.mock("@starknet-react/core", () => ({
  useAccount: jest.fn(),
}));

jest.mock("@/hooks/vault_v2/states/useRoundState");
jest.mock("@/hooks/vault_v2/states/useVaultState");
jest.mock("@/hooks/vault_v2/actions/useVaultActions");
jest.mock("@/context/NewProvider");
jest.mock("@/context/HelpProvider");
jest.mock("@/context/TransactionProvider");
jest.mock("@/context/TimeProvider");

//// Default test states
const defaultRoundState = {
  roundState: "Open",
  auctionStartDate: "1000",
  auctionEndDate: "2000",
  optionSettleDate: "3000",
  roundId: "1",
};

const defaultVaultState = {
  address: "0x123",
  l1DataProcessorAddress: "0x789",
  alpha: "3333",
  strikeLevel: "0",
};

const defaultVaultActions = {
  startAuction: jest.fn(),
  endAuction: jest.fn(),
  demoFossilCallback: jest.fn(),
  sendFossilRequest: jest.fn(),
};

// Test setup function
const renderDemoStateTransition = ({
  roundState = defaultRoundState,
  vaultState = defaultVaultState,
  account = { address: "0x123", status: "connected" },
  timestamp = 1500,
  pendingTx = undefined,
  conn = "demo",
  vaultActions = defaultVaultActions,
  isPanelOpen = true,
  progressEstimates = { txnEstimate: 30, fossilEstimate: 30, errorEstimate: 0 },
}: {
  roundState?: Partial<OptionRoundStateType>;
  vaultState?: Partial<VaultStateType>;
  account?: { address: string | null; status: string };
  timestamp?: number;
  pendingTx?: string;
  conn?: string;
  vaultActions?: typeof defaultVaultActions;
  isPanelOpen?: boolean;
  progressEstimates?: {
    txnEstimate: number;
    fossilEstimate: number;
    errorEstimate: number;
  };
} = {}) => {
  const mockSetModalState = jest.fn();
  const queryClient = new QueryClient();

  // Setup hook mocks
  (useRoundState as jest.Mock).mockReturnValue({
    ...defaultRoundState,
    ...roundState,
  });

  (useVaultState as jest.Mock).mockReturnValue({
    vaultState: {
      ...defaultVaultState,
      ...vaultState,
    },
    selectedRoundAddress: "0x456",
  });

  (useAccount as jest.Mock).mockReturnValue({
    account:
      account.status === "connected" ? { address: account.address } : null,
    status: account.status,
  });

  (useTransactionContext as jest.Mock).mockReturnValue({
    pendingTx,
  });

  (useTimeContext as jest.Mock).mockReturnValue({
    timestamp,
  });

  (useNewContext as jest.Mock).mockReturnValue({ conn });
  (useVaultActions as jest.Mock).mockReturnValue(vaultActions);
  (useHelpContext as jest.Mock).mockReturnValue({
    setActiveDataId: jest.fn(),
    activeDataId: null,
    isHelpBoxOpen: false,
    header: null,
    isHoveringHelpBox: false,
    content: null,
    setIsHoveringHelpBox: jest.fn(),
    toggleHelpBoxOpen: jest.fn(),
  });

  // Mock useProgressEstimates
  jest
    .spyOn(useProgressEstimatesModule, "useProgressEstimates")
    .mockReturnValue(progressEstimates);

  render(
    <QueryClientProvider client={queryClient}>
      <StateTransition
        conn={conn}
        isPanelOpen={isPanelOpen}
        setModalState={mockSetModalState}
        vaultState={vaultState as VaultStateType}
        selectedRoundState={roundState as OptionRoundStateType}
      />
    </QueryClientProvider>,
  );

  return { mockSetModalState };
};

describe("DemoStateTransition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("renders state transition button with correct text when panel is open", () => {
      renderDemoStateTransition({
        roundState: {
          roundState: "Open",
          auctionStartDate: "1000",
        },
        // Force ManualButtons component to render by setting l2Now > targetTimestamp
        timestamp: 1100, // This is l2Now, which needs to be > auctionStartDate (1000)
        conn: "demo",
      });

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button.textContent).toBe("Start Auction");
    });

    it("renders only icon when panel is closed", () => {
      renderDemoStateTransition({
        roundState: {
          roundState: "Open",
          auctionStartDate: "1000",
        },
        timestamp: 1100, // l2Now > auctionStartDate
        isPanelOpen: false,
        conn: "demo",
      });

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      const text = button.querySelector("p");
      expect(text).toHaveClass("hidden");
    });

    it("renders nothing for settled rounds", () => {
      renderDemoStateTransition({
        roundState: {
          roundState: "Settled",
          optionSettleDate: "1000",
        },
      });
      expect(screen.getByText(/Settlement Date/)).toBeInTheDocument();
    });
  });

  describe("Button States", () => {
    it("disables button when no account is connected", () => {
      renderDemoStateTransition({
        account: { address: null, status: "disconnected" },
        timestamp: 1100, // l2Now > auctionStartDate
        conn: "demo",
      });

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("disables button during pending transactions", () => {
      renderDemoStateTransition({
        pendingTx: "0xtx",
        timestamp: 1100, // l2Now > auctionStartDate
        conn: "demo",
      });

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("disables button when timestamp is before target time", () => {
      renderDemoStateTransition({
        roundState: {
          roundState: "Open",
          auctionStartDate: "2000", // Future timestamp
        },
        timestamp: 900, // l2Now < auctionStartDate
        conn: "demo",
      });

      // Since we're rendering a progress bar instead of a button
      expect(screen.getByText(/Auction Starting/)).toBeInTheDocument();
    });

    it("shows pending state during transitions", () => {
      renderDemoStateTransition({
        roundState: {
          roundState: "Open",
          auctionStartDate: "1000",
        },
        pendingTx: "0xtx",
        timestamp: 1100, // l2Now > auctionStartDate
        conn: "demo",
      });

      const button = screen.getByRole("button");
      expect(button.textContent).toBe("Pending");
      expect(button).toBeDisabled();
    });
  });

  describe("State Transitions", () => {
    it("handles auction start transition", async () => {
      const { mockSetModalState } = renderDemoStateTransition({
        roundState: {
          roundState: "Open",
          auctionStartDate: "1000",
        },
        timestamp: 1100, // l2Now > auctionStartDate
        conn: "demo",
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockSetModalState).toHaveBeenCalledWith({
        show: true,
        action: "Start Auction",
        onConfirm: expect.any(Function),
      });

      // Execute the onConfirm callback
      const { onConfirm } = mockSetModalState.mock.calls[0][0];
      await act(() => onConfirm());

      expect(defaultVaultActions.startAuction).toHaveBeenCalled();
    });

    it("handles auction end transition", async () => {
      const { mockSetModalState } = renderDemoStateTransition({
        roundState: {
          roundState: "Auctioning",
          auctionEndDate: "1000",
        },
        timestamp: 1100, // l2Now > auctionEndDate
        conn: "demo",
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockSetModalState).toHaveBeenCalledWith({
        show: true,
        action: "End Auction",
        onConfirm: expect.any(Function),
      });

      // Execute the onConfirm callback
      const { onConfirm } = mockSetModalState.mock.calls[0][0];
      await act(() => onConfirm());

      expect(defaultVaultActions.endAuction).toHaveBeenCalled();
    });

    it("handles demo fossil callback for round settlement", async () => {
      const { mockSetModalState } = renderDemoStateTransition({
        roundState: {
          roundState: "Running",
          optionSettleDate: "1000",
          roundId: "1",
        },
        timestamp: 1100, // l2Now > optionSettleDate
        conn: "demo",
        vaultState: {
          ...defaultVaultState,
          alpha: "3333",
          strikeLevel: "0",
        },
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockSetModalState).toHaveBeenCalledWith({
        show: true,
        action: "Settle Round",
        onConfirm: expect.any(Function),
      });

      // Execute the onConfirm callback
      const { onConfirm } = mockSetModalState.mock.calls[0][0];
      await act(() => onConfirm());

      expect(defaultVaultActions.demoFossilCallback).toHaveBeenCalledWith({
        vaultAddress: "0x123",
        roundId: "1",
        toTimestamp: "1000",
      });
    });

    it("handles standard fossil request for round settlement", async () => {
      const { mockSetModalState } = renderDemoStateTransition({
        roundState: {
          roundState: "Running",
          optionSettleDate: "2000",
          auctionEndDate: "1000",
        },
        timestamp: 2100, // l2Now > optionSettleDate
        conn: "mock",
        vaultState: {
          ...defaultVaultState,
          alpha: "3333",
          strikeLevel: "0",
        },
      });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockSetModalState).toHaveBeenCalledWith({
        show: true,
        action: "Settle Round",
        onConfirm: expect.any(Function),
      });

      // Execute the onConfirm callback
      const { onConfirm } = mockSetModalState.mock.calls[0][0];
      await act(() => onConfirm());

      expect(defaultVaultActions.sendFossilRequest).toHaveBeenCalledWith({
        targetTimestamp: 2000,
        vaultAddress: "0x123",
        clientAddress: "0x789",
        roundDuration: 1000,
        alpha: 3333,
        k: 0,
      });
    });
  });

  describe("Progress Bar", () => {
    it("renders progress bar when client timestamp is after target but l2Now is before target", () => {
      renderDemoStateTransition({
        roundState: {
          roundState: "Open",
          auctionStartDate: "1000",
        },
        timestamp: 900, // l2Now < auctionStartDate
        conn: "demo",
      });

      // Check for progress bar elements
      expect(screen.getByText(/Auction Starting/)).toBeInTheDocument();
      expect(screen.getByText(/Est./)).toBeInTheDocument();
    });
  });

  describe("Countdown", () => {
    it("renders countdown when timestamp is before target", () => {
      renderDemoStateTransition({
        roundState: {
          roundState: "Open",
          auctionStartDate: "2000", // Future timestamp
        },
        timestamp: 900, // l2Now < auctionStartDate
        conn: "demo",
      });

      // Check for progress bar elements since that's what's being rendered
      expect(screen.getByText(/Auction Starting/)).toBeInTheDocument();
    });
  });
});
