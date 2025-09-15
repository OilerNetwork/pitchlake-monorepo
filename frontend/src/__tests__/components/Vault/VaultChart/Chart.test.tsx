import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import RoundPerformanceChart from "@/components/Vault/VaultChart/Chart";
import { useNewContext } from "@/context/NewProvider";
import { useHistoricalRoundParams } from "@/hooks/chart/useHistoricalRoundParams";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import { ChartProvider } from "@/context/ChartProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useChartContext } from "@/context/ChartProvider";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import { useHelpContext } from "@/context/HelpProvider";

// Mock modules
jest.mock("@starknet-react/core", () => ({
  useAccount: jest.fn(),
  useContract: jest.fn(),
  useProvider: jest.fn(),
  useContractRead: jest.fn().mockReturnValue({
    data: "0",
    isLoading: false,
    error: null,
  }),
}));

jest.mock("@/context/NewProvider");
jest.mock("@/hooks/vault_v2/states/useRoundState");
jest.mock("@/hooks/chart/useHistoricalRoundParams");
jest.mock("@/hooks/vault_v2/states/useVaultState");
jest.mock("@/context/HelpProvider");
jest.mock("@/context/ChartProvider", () => ({
  useChartContext: jest.fn(),
  ChartProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock ChartInner since it's a complex component with its own tests
jest.mock("@/components/Vault/VaultChart/ChartInner", () => ({
  __esModule: true,
  default: () => <div role="img" aria-label="chart" />,
}));

// Initialize mocks
const mockContext = {
  useNewContext: jest.fn(),
  useHelpContext: jest.fn(() => ({
    setActiveDataId: jest.fn(),
    isHoveringHelpBox: false,
    isHelpBoxOpen: false,
    toggleHelpBoxOpen: jest.fn(),
    content: "",
    header: "",
    activeDataId: "",
    setIsHoveringHelpBox: jest.fn(),
    severity: "info",
  })),
  useChartContext: jest.fn(),
};

const mockHooks = {
  useRoundState: jest.fn(),
  useVaultState: jest.fn(),
  useHistoricalRoundParams: jest.fn(),
};

// Set up mock implementations
jest.mocked(useNewContext).mockImplementation(mockContext.useNewContext);
jest.mocked(useHelpContext).mockImplementation(mockContext.useHelpContext);
jest.mocked(useChartContext).mockImplementation(mockContext.useChartContext);
jest.mocked(useRoundState).mockImplementation(mockHooks.useRoundState);
jest.mocked(useVaultState).mockImplementation(mockHooks.useVaultState);
jest
  .mocked(useHistoricalRoundParams)
  .mockImplementation(mockHooks.useHistoricalRoundParams);

// Test setup
const queryClient = new QueryClient();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ChartProvider>{ui}</ChartProvider>
    </QueryClientProvider>,
  );
};

describe("RoundPerformanceChart", () => {
  const mockSetSelectedRound = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it("renders chart with navigation controls", () => {
    // Arrange
    mockContext.useNewContext.mockReturnValue({
      selectedRound: 3,
      setSelectedRound: mockSetSelectedRound,
      vaultAddress: "0x123",
      conn: "mock",
      wsData: { wsVaultState: {} },
      mockData: {
        vaultState: {},
        optionRoundStates: {
          "1": { address: "0x1" },
          "2": { address: "0x2" },
          "3": { address: "0x3" },
        },
      },
    });

    mockHooks.useVaultState.mockReturnValue({
      vaultState: {
        currentRoundId: "4",
        address: "0x123",
      },
    });

    mockContext.useChartContext.mockReturnValue({
      isExpandedView: false,
      setIsExpandedView: jest.fn(),
    });

    // Act
    renderWithProviders(<RoundPerformanceChart />);

    // Assert
    expect(screen.getByRole("img", { name: "chart" })).toBeInTheDocument();
    expect(screen.getByText(/Round/)).toBeInTheDocument();
    expect(screen.getByText("Round 3")).toBeInTheDocument();
  });

  it("handles expanded view toggle", () => {
    // Arrange
    const mockSetIsExpandedView = jest.fn();

    mockContext.useChartContext.mockReturnValue({
      isExpandedView: false,
      setIsExpandedView: mockSetIsExpandedView,
    });

    mockContext.useNewContext.mockReturnValue({
      selectedRound: 4,
      setSelectedRound: mockSetSelectedRound,
      vaultAddress: "0x123",
      conn: "mock",
      wsData: { wsVaultState: {} },
      mockData: {
        vaultState: {},
        optionRoundStates: {
          "4": { address: "0x4" },
        },
      },
    });

    mockHooks.useVaultState.mockReturnValue({
      vaultState: {
        currentRoundId: "4",
        address: "0x123",
      },
    });

    const { container } = renderWithProviders(<RoundPerformanceChart />);

    // Act
    const historyButton = container.querySelector('[data-item="chartHistory"]');
    if (!historyButton) {
      throw new Error("History button not found");
    }
    fireEvent.click(historyButton);

    // Assert
    expect(mockSetIsExpandedView).toHaveBeenCalledWith(true);
  });

  it("opens history modal when history button is clicked", () => {
    // Arrange
    const mockSetIsExpandedView = jest.fn();
    mockContext.useChartContext.mockReturnValue({
      isExpandedView: false,
      setIsExpandedView: mockSetIsExpandedView,
    });

    mockContext.useNewContext.mockReturnValue({
      selectedRound: 2,
      setSelectedRound: mockSetSelectedRound,
      vaultAddress: "0x123",
      conn: "mock",
      wsData: { wsVaultState: {} },
      mockData: {
        vaultState: {},
        optionRoundStates: {
          "2": { address: "0x2" },
        },
      },
    });

    mockHooks.useVaultState.mockReturnValue({
      vaultState: {
        currentRoundId: "5",
        address: "0x123",
      },
    });

    const { container } = renderWithProviders(<RoundPerformanceChart />);

    // Act
    const historyButton = container.querySelector('[data-item="chartHistory"]');
    if (!historyButton) throw new Error("History button not found");
    fireEvent.click(historyButton);

    // Assert
    expect(mockSetIsExpandedView).toHaveBeenCalledWith(true);
  });

  it("disables right navigation at current round", () => {
    // Arrange
    mockContext.useNewContext.mockReturnValue({
      selectedRound: 5,
      setSelectedRound: mockSetSelectedRound,
      vaultAddress: "0x123",
      conn: "mock",
      wsData: { wsVaultState: {} },
      mockData: {
        vaultState: {},
        optionRoundStates: {
          "5": { address: "0x5" },
        },
      },
    });

    mockHooks.useVaultState.mockReturnValue({
      vaultState: {
        currentRoundId: "5",
        address: "0x123",
      },
    });

    mockContext.useChartContext.mockReturnValue({
      isExpandedView: false,
      setIsExpandedView: jest.fn(),
    });

    const { container } = renderWithProviders(<RoundPerformanceChart />);

    // Act
    const nextButton = container.querySelector('[data-item="chartNextRound"]');
    if (!nextButton) throw new Error("Next button not found");
    fireEvent.click(nextButton);

    // Assert
    expect(mockSetSelectedRound).not.toHaveBeenCalled();
  });

  it("disables left navigation at round 1", () => {
    // Arrange
    mockContext.useNewContext.mockReturnValue({
      selectedRound: 1,
      setSelectedRound: mockSetSelectedRound,
      vaultAddress: "0x123",
      conn: "mock",
      wsData: { wsVaultState: {} },
      mockData: {
        vaultState: {},
        optionRoundStates: {
          "1": { address: "0x1" },
        },
      },
    });

    mockHooks.useVaultState.mockReturnValue({
      vaultState: {
        currentRoundId: "4",
        address: "0x123",
      },
    });

    mockContext.useChartContext.mockReturnValue({
      isExpandedView: false,
      setIsExpandedView: jest.fn(),
    });

    const { container } = renderWithProviders(<RoundPerformanceChart />);

    // Act
    const prevButton = container.querySelector(
      '[data-item="chartPreviousRound"]',
    );
    if (!prevButton) throw new Error("Previous button not found");
    fireEvent.click(prevButton);

    // Assert
    expect(mockSetSelectedRound).not.toHaveBeenCalled();
  });

  it("handles navigation between rounds", () => {
    // Arrange
    mockContext.useNewContext.mockReturnValue({
      selectedRound: 2,
      setSelectedRound: mockSetSelectedRound,
      vaultAddress: "0x123",
      conn: "mock",
      wsData: { wsVaultState: {} },
      mockData: {
        vaultState: {},
        optionRoundStates: {
          "1": { address: "0x1" },
          "2": { address: "0x2" },
          "3": { address: "0x3" },
        },
      },
    });

    mockHooks.useVaultState.mockReturnValue({
      vaultState: {
        currentRoundId: "4",
        address: "0x123",
      },
    });

    mockContext.useChartContext.mockReturnValue({
      isExpandedView: false,
      setIsExpandedView: jest.fn(),
    });

    const { container } = renderWithProviders(<RoundPerformanceChart />);

    // Act & Assert - Next Round
    const nextButton = container.querySelector('[data-item="chartNextRound"]');
    if (!nextButton) throw new Error("Next button not found");
    fireEvent.click(nextButton);
    expect(mockSetSelectedRound).toHaveBeenCalledWith(3);

    // Act & Assert - Previous Round
    const prevButton = container.querySelector(
      '[data-item="chartPreviousRound"]',
    );
    if (!prevButton) throw new Error("Previous button not found");
    fireEvent.click(prevButton);
    expect(mockSetSelectedRound).toHaveBeenCalledWith(1);
  });
});
