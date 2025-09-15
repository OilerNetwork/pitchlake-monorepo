import { renderHook, act } from "@testing-library/react";
import useMockOptionRounds from "@/hooks/mocks/useMockOptionRounds";
import { useAccount } from "@starknet-react/core";

// Mock dependencies
jest.mock("@starknet-react/core", () => ({
  __esModule: true,
  useAccount: jest.fn(),
}));

describe("useMockOptionRounds", () => {
  const mockAddress = "0x123";

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock useAccount
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    });
    // Mock Date.now()
    const mockDate = 1000000;
    jest.spyOn(Date, "now").mockImplementation(() => mockDate);
  });

  it("initializes with correct initial states", () => {
    const { result } = renderHook(() => useMockOptionRounds());

    // Check rounds state
    expect(result.current.rounds).toHaveLength(1);
    expect(result.current.rounds[0]).toMatchObject({
      roundId: 1,
      clearingPrice: "0",
      strikePrice: "10000000000",
      address: "0x1",
      capLevel: "2480",
      roundState: "Open",
      reservePrice: "2000000000",
      auctionStartDate: 1200000, // mockDate + 200000
      auctionEndDate: 1400000, // mockDate + 400000
      optionSettleDate: 1600000, // mockDate + 600000
      deploymentDate: "1",
      performanceLP: "0",
      performanceOB: "0",
    });

    // Check buyer states
    expect(result.current.buyerStates).toHaveLength(1);
    expect(result.current.buyerStates[0]).toMatchObject({
      address: mockAddress,
      roundAddress: "0x1",
      mintableOptions: 11,
      refundableOptions: 24,
      totalOptions: 35,
      payoutBalance: 100,
      bids: [],
    });
  });

  it("uses default address when not provided", () => {
    (useAccount as jest.Mock).mockReturnValue({
      address: undefined,
    });

    const { result } = renderHook(() => useMockOptionRounds());

    expect(result.current.buyerStates[0].address).toBe("0xbuyer");
  });

  it("allows updating rounds state", () => {
    const { result } = renderHook(() => useMockOptionRounds());

    const newRound = {
      ...result.current.rounds[0],
      roundState: "Running",
    };

    act(() => {
      result.current.setRounds([newRound]);
    });

    expect(result.current.rounds[0].roundState).toBe("Running");
  });

  it("allows updating buyer states", () => {
    const { result } = renderHook(() => useMockOptionRounds());

    const newBuyerState = {
      ...result.current.buyerStates[0],
      mintableOptions: 20,
    };

    act(() => {
      result.current.setBuyerStates([newBuyerState]);
    });

    expect(result.current.buyerStates[0].mintableOptions).toBe(20);
  });
});

