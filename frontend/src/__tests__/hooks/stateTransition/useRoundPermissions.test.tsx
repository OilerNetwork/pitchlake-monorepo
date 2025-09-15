import { renderHook } from "@testing-library/react";
import { useRoundPermissions } from "@/hooks/stateTransition/useRoundPermissions";
import { OptionRoundStateType } from "@/lib/types";
import { useNewContext } from "@/context/NewProvider";

// Mock dependencies
jest.mock("@/context/NewProvider", () => ({
  useNewContext: jest.fn().mockReturnValue({
    conn: "mock"
  })
}));

describe("useRoundPermissions", () => {
  const FOSSIL_DELAY = 3600; // 1 hour in seconds
  const mockRoundState: OptionRoundStateType = {
    address: "0x123",
    vaultAddress: "0x456",
    roundId: "1",
    roundState: "Open",
    deploymentDate: "500",
    auctionStartDate: "1000",
    auctionEndDate: "2000",
    optionSettleDate: "3000",
    startingLiquidity: "1000000",
    soldLiquidity: "0",
    unsoldLiquidity: "1000000",
    reservePrice: "100",
    strikePrice: "200",
    capLevel: "300",
    availableOptions: "1000",
    optionSold: "0",
    clearingPrice: "0",
    premiums: "0",
    settlementPrice: "0",
    optionsSold: "0",
    totalPayout: "0",
    payoutPerOption: "0",
    treeNonce: "0",
    performanceLP: "0",
    performanceOB: "0",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with all permissions false when no round state", () => {
    const timestamp = 500;
    const { result } = renderHook(() =>
      useRoundPermissions(timestamp, undefined, FOSSIL_DELAY)
    );

    expect(result.current.canAuctionStart).toBe(false);
    expect(result.current.canAuctionEnd).toBe(false);
    expect(result.current.canRoundSettle).toBe(false);
    expect(result.current.canSendFossilRequest).toBe(false);
  });

  it("calculates permissions correctly based on timestamps", () => {
    // Test before auction start
    const { result: beforeStart } = renderHook(() =>
      useRoundPermissions(999, mockRoundState, FOSSIL_DELAY)
    );
    expect(beforeStart.current.canAuctionStart).toBe(false);
    expect(beforeStart.current.canAuctionEnd).toBe(false);

    // Test at auction start
    const { result: atStart } = renderHook(() =>
      useRoundPermissions(1000, mockRoundState, FOSSIL_DELAY)
    );
    expect(atStart.current.canAuctionStart).toBe(true);
    expect(atStart.current.canAuctionEnd).toBe(false);

    // Test at auction end
    const { result: atEnd } = renderHook(() =>
      useRoundPermissions(2000, mockRoundState, FOSSIL_DELAY)
    );
    expect(atEnd.current.canAuctionStart).toBe(true);
    expect(atEnd.current.canAuctionEnd).toBe(true);

    // Test at fossil request time
    const fossilTime = Number(mockRoundState.optionSettleDate) + FOSSIL_DELAY;
    const { result: atFossil } = renderHook(() =>
      useRoundPermissions(fossilTime, mockRoundState, FOSSIL_DELAY)
    );
    expect(atFossil.current.canSendFossilRequest).toBe(true);
    expect(atFossil.current.canRoundSettle).toBe(true);
  });

  it("handles undefined round state", () => {
    const { result } = renderHook(() =>
      useRoundPermissions(1000, undefined, FOSSIL_DELAY)
    );
    expect(result.current.canAuctionStart).toBe(false);
    expect(result.current.canAuctionEnd).toBe(false);
    expect(result.current.canRoundSettle).toBe(false);
    expect(result.current.canSendFossilRequest).toBe(false);
  });

  it("updates permissions when round state changes", () => {
    const timestamp = 2500;
    const { result, rerender } = renderHook(
      ({ state }) => useRoundPermissions(timestamp, state, FOSSIL_DELAY),
      {
        initialProps: { state: mockRoundState },
      }
    );

    // Initial permissions
    expect(result.current.canAuctionStart).toBe(true);
    expect(result.current.canAuctionEnd).toBe(true);
    expect(result.current.canRoundSettle).toBe(false);
    expect(result.current.canSendFossilRequest).toBe(false);

    // Update round state with different dates
    const newState = {
      ...mockRoundState,
      auctionStartDate: "3000",
      auctionEndDate: "4000",
      optionSettleDate: "5000",
    };

    rerender({ state: newState });

    // Permissions should update based on new dates
    expect(result.current.canAuctionStart).toBe(false);
    expect(result.current.canAuctionEnd).toBe(false);
    expect(result.current.canRoundSettle).toBe(false);
    expect(result.current.canSendFossilRequest).toBe(false);
  });
});