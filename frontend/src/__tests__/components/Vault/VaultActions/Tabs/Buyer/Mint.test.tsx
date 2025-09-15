import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Mint from "@/components/Vault/VaultActions/Tabs/Buyer/Mint";
import { TestWrapper } from "../../../../../utils/TestWrapper";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import useOptionBuyerStateRPC from "@/hooks/vault_v2/rpc/useOptionBuyerStateRPC";
import useOBState from "@/hooks/vault_v2/states/useOBState";
import { useHelpContext } from "@/context/HelpProvider";

// Mock the hooks
jest.mock("@/hooks/vault_v2/actions/useVaultActions", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/hooks/vault_v2/rpc/useOptionBuyerStateRPC", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/hooks/vault_v2/states/useOBState", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/context/HelpProvider", () => ({
  useHelpContext: jest.fn().mockReturnValue({
    setActiveDataId: jest.fn(),
    activeDataId: null,
    isHelpBoxOpen: false,
    header: null,
    isHoveringHelpBox: false,
    content: null,
    setIsHoveringHelpBox: jest.fn(),
    toggleHelpBoxOpen: jest.fn(),
  }),
}));

jest.mock("@/context/TransactionProvider", () => ({
  useTransactionContext: jest.fn().mockReturnValue({
    pendingTx: false,
    setStatusModalProps: jest.fn(),
    updateStatusModalProps: jest.fn(),
  }),
}));

jest.mock("@/context/NewProvider", () => ({
  useNewContext: () => ({
    conn: "rpc",
    selectedRound: 1,
    vaultAddress: "0x123",
    wsData: {
      wsVaultState: {
        alpha: "1000",
        strikeLevel: "0",
        lockedBalance: "1000000000000000000",
        unlockedBalance: "2000000000000000000",
        stashedBalance: "0",
        queuedBps: "0",
        roundAddress: "0x123",
        deploymentDate: "1234567890",
      },
      wsOptionRoundStates: [
        {
          address: "0x123",
          alpha: "1000",
          strikeLevel: "0",
          ethAddress: "0x456",
          l1DataProcessorAddress: "0x789",
          currentRoundId: "1",
          lockedBalance: "1000000000000000000",
          unlockedBalance: "2000000000000000000",
          stashedBalance: "0",
          queuedBps: "0",
          roundAddress: "0x123",
          deploymentDate: "1234567890",
        },
      ],
      wsOptionBuyerStates: [],
    },
    mockData: {
      optionRoundStates: [],
      optionBuyerStates: [],
    },
  }),
}));

type ContractFunctionName =
  | "get_alpha"
  | "get_strike_level"
  | "get_eth_address"
  | "get_fossil_client_address"
  | "get_current_round_id"
  | "get_vault_locked_balance"
  | "get_vault_unlocked_balance"
  | "get_vault_stashed_balance"
  | "get_vault_queued_bps"
  | "get_round_address"
  | "get_deployment_date";

jest.mock("@starknet-react/core", () => ({
  useAccount: jest.fn().mockReturnValue({
    account: "0x123",
    address: "0x123",
  }),
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
  useContractRead: jest
    .fn()
    .mockImplementation(
      ({ functionName }: { functionName: ContractFunctionName }) => {
        const mockData: Record<ContractFunctionName, { data: string }> = {
          get_alpha: { data: "1000" },
          get_strike_level: { data: "0" },
          get_eth_address: { data: "0x123" },
          get_fossil_client_address: { data: "0x456" },
          get_current_round_id: { data: "1" },
          get_vault_locked_balance: { data: "1000" },
          get_vault_unlocked_balance: { data: "2000" },
          get_vault_stashed_balance: { data: "500" },
          get_vault_queued_bps: { data: "100" },
          get_round_address: { data: "0x789" },
          get_deployment_date: { data: "1000000" },
        };
        return mockData[functionName] || { data: undefined };
      },
    ),
}));

// Mock the Icons component
jest.mock("@/components/Icons", () => ({
  HammerIcon: () => <div data-testid="mint-icon" />,
}));

describe("Mint Component", () => {
  const mockShowConfirmation = jest.fn();
  const mockTokenizeOptions = jest
    .fn()
    .mockImplementation(() => Promise.resolve("0x123"));

  beforeEach(() => {
    jest.clearAllMocks();
    (useOptionBuyerStateRPC as jest.Mock).mockReturnValue({
      mintableOptions: "1000",
    });
    (useOBState as jest.Mock).mockReturnValue({
      mintableOptions: "1000",
    });
    (useVaultActions as jest.Mock).mockReturnValue({
      mintOptions: mockTokenizeOptions,
    });
  });

  it("renders mint component and handles minting flow", async () => {
    render(
      <TestWrapper>
        <Mint showConfirmation={mockShowConfirmation} />
      </TestWrapper>,
    );

    // Check initial render
    expect(screen.getByTestId("mint-icon")).toBeInTheDocument();

    // Check mintable balance text
    const mintableBalanceText = screen.getByText(
      /Your mintable option balance is/,
    );
    expect(mintableBalanceText).toBeInTheDocument();
    expect(
      mintableBalanceText.querySelector(".text-\\[\\#fafafa\\]"),
    ).toHaveTextContent("1,000");

    // Check total options
    expect(screen.getByText("Total Options")).toBeInTheDocument();
    const totalOptionsValue = screen
      .getByText("Total Options")
      .parentElement?.querySelector(".text-white");
    expect(totalOptionsValue).toHaveTextContent("1,000");

    // Initiate mint
    fireEvent.click(screen.getByRole("button", { name: "Mint Now" }));

    // Verify confirmation modal was shown with correct text
    expect(mockShowConfirmation).toHaveBeenCalledWith(
      "Mint",
      expect.anything(),
      expect.any(Function),
    );

    // Complete mint flow
    const onConfirm = mockShowConfirmation.mock.calls[0][2];
    await act(async () => {
      await onConfirm();
    });

    expect(mockTokenizeOptions).toHaveBeenCalledWith({
      roundAddress: expect.any(String),
    });
  });
});
