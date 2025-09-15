import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Refund from "@/components/Vault/VaultActions/Tabs/Buyer/Refund";
import { useAccount } from "@starknet-react/core";
import { useTransactionContext } from "@/context/TransactionProvider";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useOBState from "@/hooks/vault_v2/states/useOBState";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import { useNewContext } from "@/context/NewProvider";
import { useHelpContext } from "@/context/HelpProvider";

// Centralized mock configuration
const mockConfig = {
  // Mock values representing specific states
  addresses: {
    user: "0x123",
    selectedRound: "0x456",
  },
  balances: {
    oneEth: "1000000000000000000", // 1 ETH in wei
    zero: "0",
  },
  hooks: {
    account: {
      connected: {
        address: "0x123",
        account: { address: "0x123" },
        status: "connected",
      },
      disconnected: {
        account: null,
        status: "disconnected",
      },
    },
    transaction: {
      idle: {
        pendingTx: false,
        setStatusModalProps: jest.fn(),
        updateStatusModalProps: jest.fn(),
      },
      pending: {
        pendingTx: true,
        setStatusModalProps: jest.fn(),
        updateStatusModalProps: jest.fn(),
      },
    },
    vaultState: {
      default: {
        selectedRoundAddress: "0x456",
        roundState: "Auctioning",
        isLoading: false,
      },
    },
    optionBuyerState: {
      withBalance: {
        refundableOptions: "1000000000000000000",
        hasMinted: false,
        isLoading: false,
      },
      withoutBalance: {
        refundableOptions: "0",
        hasMinted: false,
        isLoading: false,
      },
      minted: {
        refundableOptions: "0",
        hasMinted: true,
        isLoading: false,
      },
    },
    context: {
      rpc: {
        conn: "rpc",
        wsData: null,
        mockData: {
          vaultState: {
            currentRoundId: "5",
            address: "0x123",
            roundState: "Auctioning",
          },
        },
      },
      ws: {
        conn: "ws",
        wsData: {
          wsVaultState: {
            currentRoundId: "5",
            address: "0x123",
            roundState: "Auctioning",
          },
        },
      },
    },
  },
};

// Mock all hooks
jest.mock("@starknet-react/core", () => ({
  __esModule: true,
  useAccount: jest.fn(),
  useContract: jest.fn(),
  useProvider: jest.fn(),
}));

jest.mock("@/context/TransactionProvider", () => ({
  __esModule: true,
  useTransactionContext: jest.fn(),
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="transaction-provider">{children}</div>
  ),
}));

jest.mock("@/context/HelpProvider", () => ({
  __esModule: true,
  useHelpContext: jest.fn(),
  HelpProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="help-provider">{children}</div>
  ),
}));

jest.mock("@/context/NewProvider", () => ({
  __esModule: true,
  useNewContext: jest.fn(),
}));

jest.mock("@/hooks/vault_v2/states/useVaultState", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/hooks/vault_v2/states/useOBState", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/hooks/vault_v2/actions/useVaultActions", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Reusable setup function
const setupTest = (overrides = {}) => {
  const mockShowConfirmation = jest.fn();
  const mockRefundUnusedBids = jest.fn();

  // Default setup
  (useAccount as jest.Mock).mockReturnValue(mockConfig.hooks.account.connected);
  (useVaultState as jest.Mock).mockReturnValue(
    mockConfig.hooks.vaultState.default,
  );
  (useOBState as jest.Mock).mockReturnValue(
    mockConfig.hooks.optionBuyerState.withBalance,
  );
  (useVaultActions as jest.Mock).mockReturnValue({
    refundUnusedBids: mockRefundUnusedBids,
  });
  (useTransactionContext as jest.Mock).mockReturnValue(
    mockConfig.hooks.transaction.idle,
  );
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
  (useNewContext as jest.Mock).mockReturnValue(mockConfig.hooks.context.rpc);

  // Apply any overrides
  Object.entries(overrides).forEach(([key, value]) => {
    const mockFn = {
      useAccount,
      useVaultState,
      useOBState,
      useVaultActions,
      useTransactionContext,
      useHelpContext,
      useNewContext,
    }[key];
    if (mockFn) {
      (mockFn as jest.Mock).mockReturnValue(value);
    }
  });

  return {
    mockShowConfirmation,
    mockRefundUnusedBids,
    render: () =>
      renderWithProviders(<Refund showConfirmation={mockShowConfirmation} />),
  };
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <div data-testid="help-provider">
      <div data-testid="transaction-provider">{ui}</div>
    </div>,
  );
};

describe("Refund Component", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_ENVIRONMENT: "rpc" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Initial Rendering", () => {
    it("renders with initial state", () => {
      const { render } = setupTest();
      render();

      expect(screen.getByText(/1 ETH/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Refund/i })).toBeEnabled();
    });
  });

  describe("Button States", () => {
    it("disables button when account is not connected", () => {
      const { render } = setupTest({
        useAccount: mockConfig.hooks.account.disconnected,
      });
      render();

      expect(screen.getByRole("button", { name: /Refund/i })).toBeDisabled();
    });

    it("disables button when transaction is pending", () => {
      const { render } = setupTest({
        useTransactionContext: mockConfig.hooks.transaction.pending,
      });
      render();

      expect(screen.getByRole("button", { name: /Refund/i })).toBeDisabled();
    });

    it("disables button when refundable balance is 0", () => {
      const { render } = setupTest({
        useOBState: mockConfig.hooks.optionBuyerState.withoutBalance,
      });
      render();

      expect(screen.getByRole("button", { name: /Refund/i })).toBeDisabled();
    });

    it("disables button when options have been minted", () => {
      const { render } = setupTest({
        useOBState: mockConfig.hooks.optionBuyerState.minted,
      });
      render();

      expect(screen.getByRole("button", { name: /Refund/i })).toBeDisabled();
    });
  });

  describe("Refund Action", () => {
    it("shows confirmation modal when refund button is clicked", () => {
      const { render, mockShowConfirmation } = setupTest();
      render();

      fireEvent.click(screen.getByRole("button", { name: /Refund/i }));

      expect(mockShowConfirmation).toHaveBeenCalledWith(
        "Refund",
        expect.anything(),
        expect.any(Function),
      );
    });

    it("calls refundUnusedBids when confirmation is confirmed", async () => {
      const { render, mockShowConfirmation, mockRefundUnusedBids } = setupTest();
      mockRefundUnusedBids.mockResolvedValue("0x123");
      render();

      fireEvent.click(screen.getByRole("button", { name: /Refund/i }));
      const onConfirm = mockShowConfirmation.mock.calls[0][2];
      await onConfirm();

      expect(mockRefundUnusedBids).toHaveBeenCalledWith({
        roundAddress: mockConfig.addresses.selectedRound,
        optionBuyer: mockConfig.addresses.user,
      });
    });

    it("handles successful refund", async () => {
      const mockSetStatusModalProps = jest.fn();
      const mockUpdateStatusModalProps = jest.fn();
      const { render, mockShowConfirmation, mockRefundUnusedBids } = setupTest({
        useTransactionContext: {
          pendingTx: false,
          setStatusModalProps: mockSetStatusModalProps,
          updateStatusModalProps: mockUpdateStatusModalProps,
        },
      });
      mockRefundUnusedBids.mockResolvedValue("0x123");
      render();

      fireEvent.click(screen.getByRole("button", { name: /Refund/i }));
      const onConfirm = mockShowConfirmation.mock.calls[0][2];
      await onConfirm();

      expect(mockSetStatusModalProps).toHaveBeenCalledWith(expect.objectContaining({
        version: "success",
        txnHeader: "Refund Successful",
      }));
      expect(mockUpdateStatusModalProps).toHaveBeenCalledWith({
        txnHash: "0x123",
      });
    });

    it("handles failed refund", async () => {
      const mockSetStatusModalProps = jest.fn();
      const mockUpdateStatusModalProps = jest.fn();
      const { render, mockShowConfirmation, mockRefundUnusedBids } = setupTest({
        useTransactionContext: {
          pendingTx: false,
          setStatusModalProps: mockSetStatusModalProps,
          updateStatusModalProps: mockUpdateStatusModalProps,
        },
      });
      mockRefundUnusedBids.mockRejectedValue(new Error("Refund failed"));
      render();

      fireEvent.click(screen.getByRole("button", { name: /Refund/i }));
      const onConfirm = mockShowConfirmation.mock.calls[0][2];
      await onConfirm();

      expect(mockSetStatusModalProps).toHaveBeenCalledWith(expect.objectContaining({
        version: "failure",
        txnHeader: "Refund Successful",
      }));
    });
  });
});
