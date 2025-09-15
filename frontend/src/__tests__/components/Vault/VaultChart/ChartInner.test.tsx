import React from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import GasPriceChart from "@/components/Vault/VaultChart/ChartInner";
import { useChartContext } from "@/context/ChartProvider";
import useChart from "@/hooks/chart/useChartData";
import { useHistoricalRoundParams } from "@/hooks/chart/useHistoricalRoundParams";

// Mock the hooks
jest.mock("@starknet-react/core", () => ({
  useProvider: jest.fn(() => ({
    provider: {
      getBlock: jest.fn(),
      callContract: jest.fn(),
    },
  })),
}));

jest.mock("@/context/NewProvider", () => ({
  useNewContext: jest.fn(() => ({
    selectedRound: "1",
    conn: "mock",
    wsData: {
      wsVaultState: {
        currentRoundId: "5",
        address: "0x123",
      },
    },
    mockData: {
      vaultState: {
        currentRoundId: "5",
        address: "0x123",
      },
      optionRoundStates: [
        {
          address: "0x123",
          roundId: "1",
          startTimestamp: "1000",
          duration: "1000",
          roundState: "Auctioning",
        },
      ],
    },
  })),
}));

jest.mock("@/context/HelpProvider", () => ({
  useHelpContext: jest.fn(() => ({
    setActiveDataId: jest.fn(),
    isHoveringHelpBox: false,
  })),
}));

jest.mock("@/hooks/chart/useHistoricalRoundParams", () => ({
  useHistoricalRoundParams: jest.fn(({ vaultAddress, fromRound, toRound }) => ({
    vaultData: {
      rounds: [
        {
          roundId: fromRound,
          deploymentDate: "1000",
          optionSettleDate: "2000",
          strikePrice: "100000000000",
          capLevel: "1000",
          address: vaultAddress,
        },
      ],
    },
  })),
}));

jest.mock("@/hooks/chart/useChartData", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    parsedData: [
      { 
        timestamp: 1000, 
        confirmedTwap: 100,
        confirmedBasefee: 90,
        unconfirmedTwap: 110,
        unconfirmedBasefee: 95,
        STRIKE: 100,
        CAP_LEVEL: 110
      }
    ],
    verticalSegments: [],
    roundAreas: [],
    xTicks: [1000],
    xTickLabels: {
      1000: { label: "Round 1", roundId: "1" }
    },
    yMax: 200,
    yTicks: [0, 50, 100, 150, 200]
  }))
}));

jest.mock("@/context/ChartProvider", () => ({
  useChartContext: jest.fn(() => ({
    isExpandedView: false,
    setIsExpandedView: jest.fn(),
    xMax: 2000,
    xMin: 1000,
  })),
}));

jest.mock("@/hooks/vault_v2/states/useRoundState", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    deploymentDate: "1000",
    optionSettleDate: "2000",
    strikePrice: "100000000000",
    capLevel: "1000",
  })),
}));

jest.mock("@/hooks/vault_v2/states/useVaultState", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    vaultState: {
      address: "0x123",
      currentRoundId: "5",
    },
    isLoading: false,
    error: null,
  })),
}));

// Mock recharts components
jest.mock("recharts", () => ({
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  Area: ({ dataKey }: { dataKey: string }) => {
    const testId = `chart-area-${dataKey.toLowerCase().replace(/\./g, "")}`;
    return <div data-testid={testId} />;
  },
  Line: ({ dataKey }: { dataKey: string }) => {
    const testId = `chart-line-${dataKey.toLowerCase().replace(/\./g, "")}`;
    return <div data-testid={testId} />;
  },
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ReferenceLine: () => <div data-testid="reference-line" />,
  ReferenceArea: () => <div data-testid="reference-area" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Defs: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="defs">{children}</div>
  ),
  LinearGradient: ({
    children,
    id,
  }: {
    children: React.ReactNode;
    id: string;
  }) => <div data-testid="linear-gradient">{children}</div>,
  Stop: ({ offset, stopColor }: { offset: string; stopColor: string }) => (
    <div data-testid="stop" style={{ offset, backgroundColor: stopColor }} />
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("GasPriceChart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders chart with correct components and data visualization", () => {
    (useChart as jest.Mock).mockReturnValue({

      parsedData: [
        { 
          timestamp: 1000, 
          confirmedTwap: 100,
          confirmedBasefee: 90,
          unconfirmedTwap: 110,
          unconfirmedBasefee: 95,
          STRIKE: 100,
          CAP_LEVEL: 110
        }
      ],
      verticalSegments: [],
      roundAreas: [],
      xTicks: [1000],
      xTickLabels: {
        1000: { label: "Round 1", roundId: "1" }
      },
      yMax: 200,
      yTicks: [0, 50, 100, 150, 200]
    });

    const { getByTestId } = renderWithProviders(
      <GasPriceChart
        activeLines={{
          TWAP: true,
          BASEFEE: true,
          STRIKE: true,
          CAP_LEVEL: true,
        }}
      />,
    );

    expect(getByTestId("responsive-container")).toBeInTheDocument();
    expect(getByTestId("composed-chart")).toBeInTheDocument();
    expect(getByTestId("chart-area-confirmedtwap")).toBeInTheDocument();
    expect(getByTestId("chart-area-confirmedbasefee")).toBeInTheDocument();
  });

  it("handles missing data by showing loading state", () => {
    (useChart as jest.Mock).mockReturnValue({ parsedData: undefined });
    (useHistoricalRoundParams as jest.Mock).mockReturnValue({ vaultData: undefined });

    const { container } = renderWithProviders(
      <GasPriceChart
        activeLines={{
          TWAP: true,
          BASEFEE: true,
        }}
      />,
    );

    expect(
      container.querySelector(".gas-price-chart-loading"),
    ).toBeInTheDocument();
  });

  it("renders only active data lines", () => {
    (useChart as jest.Mock).mockReturnValue({
      parsedData: [
        { 
          timestamp: 1000, 
          confirmedTwap: 100,
          confirmedBasefee: 90,
          unconfirmedTwap: 110,
          unconfirmedBasefee: 95,
          STRIKE: 100,
          CAP_LEVEL: 110,
        },
      ],
      verticalSegments: [],
      roundAreas: [],
      xTicks: [1000],
      xTickLabels: {
        1000: { label: "Round 1", roundId: "1" }
      },
      yMax: 200,
      yTicks: [0, 50, 100, 150, 200]
    });

    const { getByTestId, queryByTestId } = renderWithProviders(
      <GasPriceChart
        activeLines={{
          TWAP: true,
          BASEFEE: false,
          STRIKE: false,
          CAP_LEVEL: false,
        }}
      />,
    );

    expect(getByTestId("responsive-container")).toBeInTheDocument();
    expect(getByTestId("chart-area-confirmedtwap")).toBeInTheDocument();
    expect(
      queryByTestId("chart-area-confirmedbasefee"),
    ).not.toBeInTheDocument();
  });

  it("handles expanded view with multiple rounds", () => {
    (useChartContext as jest.Mock).mockReturnValue({
      isExpandedView: true,
      setIsExpandedView: jest.fn(),
      xMax: 2000,
      xMin: 1000,
    });

    (useChart as jest.Mock).mockReturnValue({
      parsedData: [
        { 
          timestamp: 1000, 
          confirmedTwap: 100,
          confirmedBasefee: 90,
          unconfirmedTwap: 110,
          unconfirmedBasefee: 95,
          STRIKE: 100,
          CAP_LEVEL: 110,
        },
        {
          timestamp: 2000,
          confirmedTwap: 200,
          confirmedBasefee: 180,
          unconfirmedTwap: 210,
          unconfirmedBasefee: 185,
          STRIKE: 100,
          CAP_LEVEL: 110,
        },
      ],
      verticalSegments: [],
      roundAreas: [{ start: 1000, end: 2000 }],
      xTicks: [1000, 2000],
      xTickLabels: {
        1000: { label: "Round 1", roundId: "1" },
        2000: { label: "Round 2", roundId: "2" }
      },
      yMax: 200,
      yTicks: [0, 50, 100, 150, 200]
    });

    const { getByTestId } = renderWithProviders(
      <GasPriceChart
        activeLines={{
          TWAP: true,
          BASEFEE: true,
          STRIKE: true,
          CAP_LEVEL: true,
        }}
      />,
    );

    expect(getByTestId("responsive-container")).toBeInTheDocument();
    expect(getByTestId("chart-area-confirmedtwap")).toBeInTheDocument();
    expect(getByTestId("reference-area")).toBeInTheDocument();
  });
});
