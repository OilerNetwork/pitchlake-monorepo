import { renderHook, act } from "@testing-library/react";
import useMockVault from "@/hooks/mocks/useMockVault";
import { useAccount } from "@starknet-react/core";
import useMockOptionRounds from "@/hooks/mocks/useMockOptionRounds";

// Mock dependencies
jest.mock("@starknet-react/core", () => ({
  useAccount: jest.fn(),
}));

jest.mock("@/hooks/mocks/useMockOptionRounds", () => jest.fn());

describe("useMockVault", () => {
  const mockAddress = "0x123";
  const mockAccountAddress = "0x456";
  const mockTimestamp = 1000;
  const mockSelectedRound = 1;

  const mockRounds = [
    {
      roundId: "1",
      roundState: "Open",
      clearingPrice: "0",
      strikePrice: "10000000000",
      address: "0x1",
      capLevel: "2480",
      reservePrice: "2000000000",
      deploymentDate: "1000",
      auctionStartDate: "201000",
      auctionEndDate: "401000",
      optionSettleDate: "601000",
      soldLiquidity: "",
      unsoldLiquidity: "",
      optionSold: "",
      totalPayout: "",
      treeNonce: "",
      performanceLP: "",
      performanceOB: "",
    },
  ];

  const mockBuyerStates = [
    {
      address: mockAddress,
      roundAddress: "0x1",
      mintableOptions: "",
      refundableOptions: "",
      bids: [],
      totalOptions: "0",
      payoutBalance: "0",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock useAccount
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAccountAddress,
    });
    // Mock useMockOptionRounds
    (useMockOptionRounds as jest.Mock).mockReturnValue({
      rounds: mockRounds,
      setRounds: jest.fn(),
      buyerStates: mockBuyerStates,
      setBuyerStates: jest.fn(),
    });
  });

  it("initializes with correct initial states", () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    expect(result.current.vaultState).toEqual({
      address: mockAddress,
      vaultType: "ITM",
      alpha: "5555",
      ethAddress: "0x00",
      l1DataProcessorAddress: "0x00",
      currentRoundId: 1,
      lockedBalance: "0",
      unlockedBalance: "123456789123456789123",
      stashedBalance: "112233445566778899",
      queuedBps: "0",
      strikeLevel: "-1111",
      now: "0",
      deploymentDate: "1",
      currentRoundAddress: "",
    });

    expect(result.current.lpState).toEqual({
      address: mockAccountAddress,
      lockedBalance: "12800000000000000000",
      unlockedBalance: "1500000000000000000",
      stashedBalance: "123000000000000000",
      queuedBps: "1234",
    });
  });

  it("provides mock vault actions", () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    expect(result.current.vaultActions).toHaveProperty("depositLiquidity");
    expect(result.current.vaultActions).toHaveProperty("withdrawLiquidity");
    expect(result.current.vaultActions).toHaveProperty("withdrawStash");
    expect(result.current.vaultActions).toHaveProperty("queueWithdrawal");
    expect(result.current.vaultActions).toHaveProperty("startAuction");
    expect(result.current.vaultActions).toHaveProperty("endAuction");
    expect(result.current.vaultActions).toHaveProperty("settleOptionRound");
    expect(result.current.vaultActions).toHaveProperty("placeBid");
    expect(result.current.vaultActions).toHaveProperty("refundUnusedBids");
    expect(result.current.vaultActions).toHaveProperty("updateBid");
    expect(result.current.vaultActions).toHaveProperty("mintOptions");
    expect(result.current.vaultActions).toHaveProperty("exerciseOptions");
  });

  it("handles auction state transitions", async () => {
    const mockSetRounds = jest.fn();
    (useMockOptionRounds as jest.Mock).mockReturnValue({
      rounds: mockRounds,
      setRounds: mockSetRounds,
      buyerStates: mockBuyerStates,
      setBuyerStates: jest.fn(),
      //roundActions: {},
    });

    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    // Start auction
    await act(async () => {
      await result.current.vaultActions.startAuction();
    });
    expect(mockSetRounds).toHaveBeenCalled();

    // End auction
    await act(async () => {
      await result.current.vaultActions.endAuction();
    });
    expect(mockSetRounds).toHaveBeenCalled();
  });

  it("handles option round settlement", async () => {
    const mockSetRounds = jest.fn();
    const mockSetBuyerStates = jest.fn();
    (useMockOptionRounds as jest.Mock).mockReturnValue({
      rounds: [{ ...mockRounds[0], roundState: "Running" }],
      setRounds: mockSetRounds,
      buyerStates: mockBuyerStates,
      setBuyerStates: mockSetBuyerStates,
      //roundActions: {},
    });

    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    await act(async () => {
      await result.current.vaultActions.settleOptionRound();
    });

    expect(mockSetRounds).toHaveBeenCalled();
    expect(mockSetBuyerStates).toHaveBeenCalled();
  });

  it("handles deposit liquidity action", async () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    await act(async () => {
      await result.current.vaultActions.depositLiquidity({
        beneficiary: mockAccountAddress,
        amount: BigInt(1000),
      });
    });
  });

  it("handles withdraw liquidity action", async () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    await act(async () => {
      await result.current.vaultActions.withdrawLiquidity({
        amount: BigInt(1000),
      });
    });
  });

  it("handles withdraw stash action", async () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    await act(async () => {
      await result.current.vaultActions.withdrawStash({
        account: mockAccountAddress,
      });
    });
  });

  it("handles queue withdrawal action", async () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    await act(async () => {
      await result.current.vaultActions.queueWithdrawal({
        bps: BigInt(1000),
      });
    });
  });

  it("handles place bid action", async () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );
    const { result: result2 } = renderHook(() => useMockOptionRounds());

    await act(async () => {
      await result.current.vaultActions.placeBid({
        amount: BigInt(1000),
        price: BigInt(2000),
      });
    });

    // Verify bid was added
    expect(result2.current.buyerStates[0].bids).toBeDefined();
  });

  it("handles refund unused bids action", async () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    await act(async () => {
      await result.current.vaultActions.refundUnusedBids({
        optionBuyer: mockAddress,
        roundAddress: "0x1",
      });
    });
  });

  it("handles update bid action", async () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    await act(async () => {
      await result.current.vaultActions.updateBid({
        bidId: "1",
        priceIncrease: BigInt(2000),
      });
    });
  });

  it("handles tokenize options action", async () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    await act(async () => {
      await result.current.vaultActions.mintOptions({ roundAddress: "0x1" });
    });
  });

  it("handles exercise options action", async () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    await act(async () => {
      await result.current.vaultActions.exerciseOptions({
        roundAddress: "0x1",
      });
    });
  });

  it("uses default address when not provided", () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp),
    );

    expect(result.current.vaultState.address).toBe("0x1");
  });

  it("exposes option round states", () => {
    const { result } = renderHook(() =>
      useMockVault(mockSelectedRound, mockTimestamp, mockAddress),
    );

    expect(result.current.optionRoundStates).toBe(mockRounds);
    expect(result.current.optionBuyerStates).toBe(mockBuyerStates);
  });
});
