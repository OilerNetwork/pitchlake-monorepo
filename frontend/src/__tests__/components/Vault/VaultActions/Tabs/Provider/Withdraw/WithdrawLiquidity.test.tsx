import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import WithdrawLiquidity from "@/components/Vault/VaultActions/Tabs/Provider/Withdraw/WithdrawLiquidity";
import { useTransactionContext } from "@/context/TransactionProvider";
import { useAccount } from "@starknet-react/core";
import { parseEther } from "ethers";
import { useNewContext } from "@/context/NewProvider";
import useLPState from "@/hooks/vault_v2/states/useLPState";
import { useHelpContext } from "@/context/HelpProvider";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import { useUiContext } from "@/context/UiProvider";

// Define types for our mocks
type MockHooks = {
  [K in keyof typeof mockHooks]: jest.Mock;
};

// Group related mocks together
const mockHooks = {
  useNewContext: jest.fn(),
  useLPState: jest.fn(),
  useVaultActions: jest.fn(),
  useTransactionContext: jest.fn(() => ({
    pendingTx: false,
    setPendingTx: jest.fn(),
    setStatusModalProps: jest.fn(),
  })),
  useHelpContext: jest.fn(() => ({
    setActiveDataId: jest.fn(),
    isHoveringHelpBox: false,
    isHelpBoxOpen: false,
    toggleHelpBoxOpen: jest.fn(),
    content: "",
    header: "",
    setIsHoveringHelpBox: jest.fn(),
    severity: "info",
  })),
  useAccount: jest.fn(),
  useContract: jest.fn(() => ({
    contract: {
      typedv2: jest.fn().mockReturnValue({
        connect: jest.fn(),
        withdraw: jest.fn().mockResolvedValue({
          transaction_hash: "0x123",
        }),
      }),
    },
  })),
  useProvider: jest.fn(() => ({
    provider: {
      getBlock: jest.fn(),
      callContract: jest.fn(),
      getNonceForAddress: jest.fn().mockResolvedValue("0x1"),
    },
  })),
  useUiContext: jest.fn(() => ({
    openWalletLogin: jest.fn(),
  })),
} as const;

// Mock all hooks using the mockHooks object
jest.mock("@/context/NewProvider", () => ({
  useNewContext: () => mockHooks.useNewContext(),
}));

jest.mock("@/hooks/vault_v2/states/useLPState", () => ({
  __esModule: true,
  default: () => mockHooks.useLPState(),
}));

jest.mock("@/hooks/vault_v2/actions/useVaultActions", () => ({
  __esModule: true,
  default: () => mockHooks.useVaultActions(),
}));

jest.mock("@/context/TransactionProvider", () => ({
  useTransactionContext: () => mockHooks.useTransactionContext(),
}));

jest.mock("@/context/HelpProvider", () => ({
  useHelpContext: () => mockHooks.useHelpContext(),
}));

jest.mock("@starknet-react/core", () => ({
  useAccount: () => mockHooks.useAccount(),
  useContract: () => mockHooks.useContract(),
  useProvider: () => mockHooks.useProvider(),
}));

jest.mock("@/context/UiProvider", () => ({
  useUiContext: () => mockHooks.useUiContext(),
}));

describe("WithdrawLiquidity", () => {
  // Reusable setup function for common test scenario
  const setupTest = (
    overrides: Partial<Record<keyof MockHooks, unknown>> = {},
  ) => {
    const mockShowConfirmation = jest.fn();
    const mockWithdrawLiquidity = jest.fn();

    const defaultMocks = {
      useNewContext: {
        conn: "mock",
        vaultAddress: "0x123",
        mockData: {
          lpState: {
            unlockedBalance: parseEther("10.0"),
          },
        },
      },
      useLPState: {
        unlockedBalance: parseEther("10.0"),
      },
      useVaultActions: {
        withdrawLiquidity: mockWithdrawLiquidity,
      },
      useTransactionContext: {
        pendingTx: false,
        setPendingTx: jest.fn(),
        setStatusModalProps: jest.fn(),
      },
      useAccount: {
        account: "0x123",
      },
      useUiContext: {
        openWalletLogin: jest.fn(),
      },
    };

    // Apply overrides to default mocks
    const mocks = { ...defaultMocks, ...overrides };

    Object.entries(mocks).forEach(([key, value]) => {
      (mockHooks[key as keyof MockHooks] as jest.Mock).mockReturnValue(value);
    });

    return { mockShowConfirmation, mockWithdrawLiquidity };
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it("renders withdrawal form with correct states and handles interactions", () => {
    const { mockShowConfirmation, mockWithdrawLiquidity } = setupTest();
    localStorage.setItem("withdrawAmount", "5.0");

    render(<WithdrawLiquidity showConfirmation={mockShowConfirmation} />);

    // Use semantic queries for better readability
    const amountInput = screen.getByRole("spinbutton");
    const balanceText = screen.getByText(/unlocked balance/i);
    const balanceAmount = screen.getByText(/10 ETH/);
    const withdrawButton = screen.getByRole("button", { name: /withdraw/i });

    expect(amountInput).toBeInTheDocument();
    expect(balanceText).toBeInTheDocument();
    expect(balanceAmount).toBeInTheDocument();
    expect(withdrawButton).toBeInTheDocument();

    // Check localStorage value loaded
    expect(amountInput).toHaveValue(5);

    // Test input changes
    fireEvent.change(amountInput, { target: { value: "7.0" } });
    expect(localStorage.getItem("withdrawAmount")).toBe("7.0");

    // Test invalid amount (exceeds balance)
    fireEvent.change(amountInput, { target: { value: "15.0" } });
    expect(screen.getByText(/exceeds balance/i)).toBeInTheDocument();

    // Test valid amount
    fireEvent.change(amountInput, { target: { value: "5.0" } });
    expect(withdrawButton).not.toBeDisabled();

    // Test empty amount
    fireEvent.change(amountInput, { target: { value: "" } });
    expect(withdrawButton).toBeDisabled();

    // Test zero amount
    fireEvent.change(amountInput, { target: { value: "0" } });
    expect(withdrawButton).toBeDisabled();

    // Test negative amount
    fireEvent.change(amountInput, { target: { value: "-1" } });
    expect(withdrawButton).toBeDisabled();

    // Test confirmation flow
    fireEvent.change(amountInput, { target: { value: "5.0" } });
    fireEvent.click(withdrawButton);

    expect(mockShowConfirmation).toHaveBeenCalledWith(
      "Liquidity Withdraw",
      expect.anything(),
      expect.any(Function),
    );

    // Test withdraw action
    const onConfirm = mockShowConfirmation.mock.calls[0][2];
    onConfirm();
    expect(mockWithdrawLiquidity).toHaveBeenCalledWith({
      amount: parseEther("5.0"),
    });
  });

  it("disables form when transaction is pending", () => {
    const { mockShowConfirmation } = setupTest({
      useTransactionContext: {
        pendingTx: true,
        setPendingTx: jest.fn(),
        setStatusModalProps: jest.fn(),
      },
    });

    render(<WithdrawLiquidity showConfirmation={mockShowConfirmation} />);

    const withdrawButton = screen.getByRole("button", { name: /withdraw/i });
    expect(withdrawButton).toBeDisabled();
  });

  it("disables form when no account is connected", () => {
    const { mockShowConfirmation } = setupTest({
      useAccount: {
        account: null,
      },
    });

    render(<WithdrawLiquidity showConfirmation={mockShowConfirmation} />);

    const withdrawButton = screen.getByRole("button", { name: /withdraw/i });
    expect(withdrawButton).toBeDisabled();
  });

  it("opens wallet login when input is clicked without connected account", () => {
    const mockOpenWalletLogin = jest.fn();
    const { mockShowConfirmation } = setupTest({
      useAccount: {
        account: null,
      },
      useUiContext: {
        openWalletLogin: mockOpenWalletLogin,
      },
    });

    render(<WithdrawLiquidity showConfirmation={mockShowConfirmation} />);

    const amountInput = screen.getByRole("spinbutton");
    fireEvent.click(amountInput);
    expect(mockOpenWalletLogin).toHaveBeenCalled();
  });
});
