import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Withdraw from "@/components/Vault/VaultActions/Tabs/Provider/Withdraw/Withdraw";
import { HelpProvider, useHelpContext } from "@/context/HelpProvider";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import { useContractRead } from "@starknet-react/core";

// Group all mocks together
const mockData = {
  vaultState: {
    currentRoundId: "5",
    address: "0x123",
    alpha: "1000",
    strikeLevel: "0",
    lockedBalance: "1000000000000000000",
    unlockedBalance: "2000000000000000000",
    stashedBalance: "0",
    queuedBps: "0",
    roundAddress: "0x123",
    deploymentDate: "1234567890",
  },
  optionRoundState: {
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
};

// Group all mock implementations
const mockImplementations = {
  starknetReact: {
    useContractRead: jest.fn(),
    useAccount: () => ({ account: { address: "0x123" } }),
    useContract: () => ({ contract: null }),
    useProvider: () => ({ provider: null }),
  },
  useRoundState: jest.fn(),
  useHelpContext: jest.fn(() => ({
    setActiveDataId: jest.fn(),
    activeDataId: null,
    isHelpBoxOpen: false,
    header: null,
    isHoveringHelpBox: false,
    content: null,
    setIsHoveringHelpBox: jest.fn(),
    toggleHelpBoxOpen: jest.fn(),
  })),
  useNewContext: jest.fn(() => ({
    conn: "mock",
    vaultAddress: "0x123",
    selectedRound: 0,
    setSelectedRound: jest.fn(),
    wsData: {
      wsVaultState: mockData.vaultState,
      wsOptionRoundStates: [mockData.optionRoundState],
      wsOptionBuyerStates: [],
    },
    mockData: {
      vaultState: mockData.vaultState,
      optionRoundStates: [mockData.optionRoundState],
      optionBuyerStates: [],
    },
  })),
};

// Mock external dependencies
jest.mock("@starknet-react/core", () => ({
  __esModule: true,
  useContractRead: () => mockImplementations.starknetReact.useContractRead(),
  useAccount: () => mockImplementations.starknetReact.useAccount(),
  useContract: () => mockImplementations.starknetReact.useContract(),
  useProvider: () => mockImplementations.starknetReact.useProvider(),
}));

jest.mock("@/hooks/vault_v2/states/useRoundState", () => ({
  __esModule: true,
  default: () => mockImplementations.useRoundState(),
}));

jest.mock("@/context/NewProvider", () => ({
  useNewContext: () => mockImplementations.useNewContext(),
}));

jest.mock("@/context/HelpProvider", () => ({
  HelpProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useHelpContext: () => mockImplementations.useHelpContext(),
}));

// Mock sub-components with descriptive test IDs
jest.mock(
  "@/components/Vault/VaultActions/Tabs/Provider/Withdraw/WithdrawLiquidity",
  () => ({
    __esModule: true,
    default: () => (
      <div data-testid="withdraw-liquidity-component">WithdrawLiquidity</div>
    ),
  }),
);

jest.mock(
  "@/components/Vault/VaultActions/Tabs/Provider/Withdraw/QueueWithdrawal",
  () => ({
    __esModule: true,
    default: () => (
      <div data-testid="queue-withdrawal-component">QueueWithdrawal</div>
    ),
  }),
);

jest.mock(
  "@/components/Vault/VaultActions/Tabs/Provider/Withdraw/WithdrawStash",
  () => ({
    __esModule: true,
    default: () => (
      <div data-testid="withdraw-stash-component">WithdrawStash</div>
    ),
  }),
);

// Reusable test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <HelpProvider>{children}</HelpProvider>
);

describe("Withdraw Component", () => {
  const mockShowConfirmation = jest.fn();

  // Reusable setup function
  const setup = (roundState: string) => {
    mockImplementations.useRoundState.mockReturnValue({ roundState });
    mockImplementations.starknetReact.useContractRead.mockReturnValue({
      data: "1000",
      isLoading: false,
      error: null,
    });

    return render(
      <TestWrapper>
        <Withdraw showConfirmation={mockShowConfirmation} />
      </TestWrapper>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correct tabs based on round state", () => {
    // Test Auctioning state
    const { rerender } = setup("Auctioning");

    // Use semantic queries
    expect(
      screen.getByRole("button", { name: "Unlocked" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Locked" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stashed" })).toBeInTheDocument();

    // Test Settled state
    mockImplementations.useRoundState.mockReturnValue({
      roundState: "Settled",
    });
    rerender(
      <TestWrapper>
        <Withdraw showConfirmation={mockShowConfirmation} />
      </TestWrapper>,
    );

    expect(
      screen.getByRole("button", { name: "Unlocked" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stashed" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Locked" }),
    ).not.toBeInTheDocument();
  });

  it("shows correct component when switching tabs", () => {
    setup("Auctioning");

    // Default tab (Liquidity)
    expect(
      screen.getByTestId("withdraw-liquidity-component"),
    ).toBeInTheDocument();

    // Switch to Queue tab
    fireEvent.click(screen.getByRole("button", { name: "Locked" }));
    expect(
      screen.getByTestId("queue-withdrawal-component"),
    ).toBeInTheDocument();

    // Switch to Collect tab
    fireEvent.click(screen.getByRole("button", { name: "Stashed" }));
    expect(screen.getByTestId("withdraw-stash-component")).toBeInTheDocument();
  });

  it("maintains correct tab visibility based on round state", () => {
    setup("Settled");

    // Queue tab and its content should not be visible
    expect(
      screen.queryByRole("button", { name: "Locked" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("queue-withdrawal-component"),
    ).not.toBeInTheDocument();

    // Other tabs should be visible
    expect(
      screen.getByTestId("withdraw-liquidity-component"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stashed" }));
    expect(screen.getByTestId("withdraw-stash-component")).toBeInTheDocument();
  });
});
