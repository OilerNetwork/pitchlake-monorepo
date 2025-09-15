import { renderHook } from "@testing-library/react";
import useLPState from "@/hooks/vault_v2/states/useLPState";
import { useNewContext } from "@/context/NewProvider";
import useLPStateRPC from "@/hooks/vault_v2/rpc/useLPStateRPC";
import { LiquidityProviderStateType } from "@/lib/types";

// Mock dependencies
jest.mock("@/context/NewProvider", () => ({
  useNewContext: jest.fn(),
}));

jest.mock("@/hooks/vault_v2/rpc/useLPStateRPC", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("useLPState", () => {
  // Test data
  const mockLPState: LiquidityProviderStateType = {
    address: "0x456",
    lockedBalance: "500000",
    unlockedBalance: "300000",
    stashedBalance: "100000",
    queuedBps: "1000",
  };

  // Mock context setup helper
  const mockContext = (config: {
    conn: "rpc" | "ws" | "mock" | "demo";
    wsState?: LiquidityProviderStateType;
    mockState?: LiquidityProviderStateType;
    vaultAddress?: string;
  }) => {
    (useNewContext as jest.Mock).mockReturnValue({
      conn: config.conn,
      wsData: { wsLiquidityProviderState: config.wsState },
      mockData: { lpState: config.mockState },
      vaultAddress: config.vaultAddress || "0x123",
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("data source selection", () => {
    it("returns RPC state when connection is RPC", () => {
      // Setup
      mockContext({ conn: "rpc" });
      (useLPStateRPC as jest.Mock).mockReturnValue(mockLPState);

      // Execute
      const { result } = renderHook(() => useLPState());

      // Verify
      expect(result.current).toEqual(mockLPState);
    });

    it("returns RPC state when connection is demo", () => {
      // Setup
      mockContext({ conn: "demo" });
      (useLPStateRPC as jest.Mock).mockReturnValue(mockLPState);

      // Execute
      const { result } = renderHook(() => useLPState());

      // Verify
      expect(result.current).toEqual(mockLPState);
    });

    it("returns WebSocket state when connection is WebSocket", () => {
      // Setup
      const wsState = { ...mockLPState, lockedBalance: "600000" };
      mockContext({ conn: "ws", wsState });

      // Execute
      const { result } = renderHook(() => useLPState());

      // Verify
      expect(result.current).toEqual(wsState);
    });

    it("returns mock state when connection is mock", () => {
      // Setup
      const mockState = { ...mockLPState, lockedBalance: "700000" };
      mockContext({ conn: "mock", mockState });

      // Execute
      const { result } = renderHook(() => useLPState());

      // Verify
      expect(result.current).toEqual(mockState);
    });
  });

  describe("context updates", () => {
    it("updates state when connection type changes", () => {
      // Setup test states
      const wsState = { ...mockLPState, lockedBalance: "600000" };
      const mockState = { ...mockLPState, lockedBalance: "700000" };
      const { result, rerender } = renderHook(() => useLPState());

      // Test RPC connection
      mockContext({ conn: "rpc", wsState, mockState });
      (useLPStateRPC as jest.Mock).mockReturnValue(mockLPState);
      rerender();
      expect(result.current).toEqual(mockLPState);

      // Test WebSocket connection
      mockContext({ conn: "ws", wsState, mockState });
      rerender();
      expect(result.current).toEqual(wsState);

      // Test mock connection
      mockContext({ conn: "mock", wsState, mockState });
      rerender();
      expect(result.current).toEqual(mockState);

      // Test demo connection
      mockContext({ conn: "demo", wsState, mockState });
      (useLPStateRPC as jest.Mock).mockReturnValue(mockLPState);
      rerender();
      expect(result.current).toEqual(mockLPState);
    });

    it("updates state when data source changes", () => {
      // Setup initial state
      const initialState = { ...mockLPState };
      const updatedState = { ...mockLPState, lockedBalance: "600000" };

      mockContext({ conn: "rpc" });
      (useLPStateRPC as jest.Mock).mockReturnValue(initialState);

      // Initial render
      const { result, rerender } = renderHook(() => useLPState());
      expect(result.current).toEqual(initialState);

      // Update data source
      (useLPStateRPC as jest.Mock).mockReturnValue(updatedState);
      rerender();
      expect(result.current).toEqual(updatedState);

      // Change connection to verify state updates
      mockContext({ conn: "ws" });
      rerender();
      expect(result.current).toBeUndefined();
    });
  });
});

