import { screen } from "@testing-library/react";
import PanelLeft from "@/components/Vault/PanelLeft";
import { renderWithProviders } from "@/__tests__/utils/TestWrapper";
import { useHelpContext } from "@/context/HelpProvider";
import { CairoCustomEnum } from "starknet";

// Mock the hooks
jest.mock("@starknet-react/core", () => ({
  useExplorer: () => ({
    getTransactionUrl: jest.fn(),
    getAddressUrl: jest.fn(),
    contract: () => "https://testnet.starkscan.co/contract/0x123",
  }),
  useProvider: () => ({
    provider: {
      getBlock: jest.fn(),
    },
  }),
  useAccount: () => ({
    account: {
      address: "0x123",
    },
  }),
  useContractRead: () => ({
    data: "1000000000000000000",
    isError: false,
    isLoading: false,
  }),
  useContract: () => ({
    data: null,
  }),
}));

const mockVaultState = {
  address: "0x123",
  lockedBalance: "1000000000000000000",
  unlockedBalance: "2000000000000000000",
  stashedBalance: "3000000000000000000",
  alpha: "1000",
  strikeLevel: "1000",
  activeVariant: () => "Auctioning",
  variant: "Auctioning",
  unwrap: () => ({
    lockedBalance: "1000000000000000000",
    unlockedBalance: "2000000000000000000",
    stashedBalance: "3000000000000000000",
  }),
} as unknown as CairoCustomEnum;

jest.mock("@/hooks/vault_v2/states/useVaultState", () => ({
  __esModule: true,
  default: () => ({
    vaultState: mockVaultState,
    selectedRoundAddress: "0x123",
  }),
}));

jest.mock("@/hooks/vault_v2/states/useRoundState", () => ({
  __esModule: true,
  default: () => ({
    address: "0x123",
    roundId: "1",
    roundState: "Auctioning",
    capLevel: "1000",
    strikePrice: "1000000000",
    reservePrice: "500000000",
    performanceLP: "10",
    performanceOB: "5",
    availableOptions: "1000",
    optionsSold: "500",
    clearingPrice: "750000000",
    settlementPrice: "800000000",
    payoutPerOption: "100000000",
    auctionStartDate: "1000000000000000000",
    auctionEndDate: "2000000000000000000",
    optionSettleDate: "3000000000000000000",
    deploymentDate: "500000000000000000",
  }),
}));

jest.mock("@/context/NewProvider", () => ({
  useNewContext: () => ({
    conn: "mock",
    selectedRound: 1,
    vaultAddress: "0x123",
    setSelectedRound: jest.fn(),
    wsData: {
      wsVaultState: {
        currentRoundId: "1",
      },
      wsOptionRoundStates: [],
    },
    mockData: {
      vaultState: {
        currentRoundId: "1",
      },
      optionRoundStates: [],
    },
  }),
}));

jest.mock("@/context/HelpProvider", () => ({
  HelpProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

describe("PanelLeft Component", () => {
  const mockSetActiveDataId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useHelpContext as jest.Mock).mockReturnValue({
      setActiveDataId: mockSetActiveDataId,
      activeDataId: null,
      isHelpBoxOpen: false,
      header: null,
      isHoveringHelpBox: false,
      content: null,
      setIsHoveringHelpBox: jest.fn(),
      toggleHelpBoxOpen: jest.fn(),
    });
  });

  it("renders panel sections", () => {
    renderWithProviders(
      <PanelLeft userType="lp" />
    );

    expect(screen.getByText("Statistics")).toBeInTheDocument();
    expect(screen.getByText("Vault")).toBeInTheDocument();
  });

  it("renders correctly for both user types", () => {
    const { rerender } = renderWithProviders(
      <PanelLeft userType="lp" />
    );

    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("Statistics")).toBeInTheDocument();
    expect(screen.getByText("Vault")).toBeInTheDocument();

    rerender(
      <PanelLeft userType="ob" />
    );

    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("Statistics")).toBeInTheDocument();
    expect(screen.getByText("Vault")).toBeInTheDocument();
  });

  it("displays correct balance values", () => {
    renderWithProviders(
      <PanelLeft userType="lp" />
    );

    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("6.00 ETH")).toBeInTheDocument();
  });

  it("displays correct round state", () => {
    renderWithProviders(
      <PanelLeft userType="lp" />
    );

    expect(screen.getByText("Auctioning")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
  });

  it("displays correct round information", () => {
    renderWithProviders(
      <PanelLeft userType="lp" />
    );

    expect(screen.getByText("Round 01")).toBeInTheDocument();
    expect(screen.getByText("1.00 Gwei")).toBeInTheDocument(); // Strike Price
    // @NOTE: Why does 0.75 work here when it should be 0.5 ?
    expect(screen.getByText("0.75 Gwei")).toBeInTheDocument(); // Clearing Price
  });
});

