import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Exercise from "@/components/Vault/VaultActions/Tabs/Buyer/Exercise";
import { useAccount } from "@starknet-react/core";
import { useTransactionContext } from "@/context/TransactionProvider";
import useErc20Balance from "@/hooks/erc20/useErc20Balance";
import useErc20Allowance from "@/hooks/erc20/useErc20Allowance";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import useOBState from "@/hooks/vault_v2/states/useOBState";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import { HelpProvider } from "@/context/HelpProvider";

// Mock the new context
jest.mock("@/context/NewProvider", () => ({
  useNewContext: jest.fn().mockReturnValue({
    conn: "rpc",
    wsData: {
      wsOptionBuyerStates: [],
      wsRoundStates: [
        {
          roundId: "1",
          startTimestamp: "1000",
          duration: "1000",
          roundState: "Open",
        },
      ],
    },
    mockData: {
      optionBuyerStates: [],
      roundStates: [],
    },
  }),
}));

jest.mock("@starknet-react/core", () => ({
  useAccount: jest.fn(),
  useContractWrite: jest.fn().mockReturnValue({
    writeAsync: jest.fn(),
    data: null,
    error: null,
    isPending: false,
  }),
  useContractRead: jest.fn().mockReturnValue({
    data: "1000000000000000000",
    isError: false,
    isLoading: false,
  }),
}));

jest.mock("@/context/TransactionProvider", () => ({
  useTransactionContext: jest.fn(),
}));

jest.mock("@/hooks/erc20/useErc20Balance", () => jest.fn());
jest.mock("@/hooks/erc20/useErc20Allowance", () => jest.fn());

jest.mock("@/hooks/vault_v2/states/useVaultState", () => jest.fn());

jest.mock("@/hooks/vault_v2/states/useRoundState", () => jest.fn());

jest.mock("@/hooks/vault_v2/states/useOBState", () => jest.fn());

jest.mock("@/hooks/vault_v2/actions/useVaultActions", () => jest.fn());

jest.mock("@/lang/en/help.json", () => ({
  exerciseButton: {
    text: "Exercise button help text",
    header: "Exercise button help header",
  },
}));

describe("Exercise Component", () => {
  const mockShowConfirmation = jest.fn();
  const mockExerciseOptions = jest.fn();

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<HelpProvider>{ui}</HelpProvider>);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useAccount as jest.Mock).mockReturnValue({
      address: "0x123",
      account: true,
    });

    (useTransactionContext as jest.Mock).mockReturnValue({
      pendingTx: false,
    });

    (useVaultState as jest.Mock).mockReturnValue({
      selectedRoundAddress: "0x456",
    });

    (useRoundState as jest.Mock).mockReturnValue({
      address: "0x456",
      payoutPerOption: "1000000000000000000", // 1 ETH
    });

    (useOBState as jest.Mock).mockReturnValue({
      mintableOptions: "100",
      hasMinted: false,
    });

    (useErc20Balance as jest.Mock).mockReturnValue({
      balance: "100",
    });

    (useVaultActions as jest.Mock).mockReturnValue({
      exerciseOptions: mockExerciseOptions,
    });
  });

  it("renders with initial state", () => {
    renderWithProviders(<Exercise showConfirmation={mockShowConfirmation} />);

    const content = screen.getByText(/You own/i);
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent(/200/);
    expect(content).toHaveTextContent(/options worth/i);
    expect(content).toHaveTextContent(/200 ETH/i);
  });

  it("handles exercise action", () => {
    renderWithProviders(<Exercise showConfirmation={mockShowConfirmation} />);

    const exerciseButton = screen.getByRole("button", { name: "Exercise Now" });
    expect(exerciseButton).toBeInTheDocument();
    expect(exerciseButton).not.toBeDisabled();

    fireEvent.click(exerciseButton);
    expect(mockShowConfirmation).toHaveBeenCalledWith(
      "Exercise",
      expect.anything(),
      expect.any(Function),
    );
  });

  it("disables exercise button when conditions are not met", () => {
    // Test with no account
    (useAccount as jest.Mock).mockReturnValue({
      address: null,
      account: null,
    });

    const { unmount } = renderWithProviders(
      <Exercise showConfirmation={mockShowConfirmation} />,
    );
    expect(screen.getByRole("button", { name: "Exercise Now" })).toBeDisabled();
    unmount();

    // Test with pending transaction
    (useAccount as jest.Mock).mockReturnValue({
      address: "0x123",
      account: true,
    });
    (useTransactionContext as jest.Mock).mockReturnValue({
      pendingTx: true,
    });

    const { unmount: unmount2 } = renderWithProviders(
      <Exercise showConfirmation={mockShowConfirmation} />,
    );
    expect(screen.getByRole("button", { name: "Exercise Now" })).toBeDisabled();
    unmount2();

    // Test with zero balance
    (useTransactionContext as jest.Mock).mockReturnValue({
      pendingTx: false,
    });
    (useErc20Balance as jest.Mock).mockReturnValue({
      balance: "0",
    });
    (useOBState as jest.Mock).mockReturnValue({
      mintableOptions: "0",
      hasMinted: true,
    });

    renderWithProviders(<Exercise showConfirmation={mockShowConfirmation} />);
    expect(screen.getByRole("button", { name: "Exercise Now" })).toBeDisabled();
  });
});
