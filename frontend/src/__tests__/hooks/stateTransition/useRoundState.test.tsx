import { renderHook } from "@testing-library/react";
import { useRoundState } from "@/hooks/stateTransition/useRoundState";
import { OptionRoundStateType } from "@/lib/types";
import { StatusData } from "@/hooks/fossil/useFossilStatus";

describe("useRoundState", () => {
  const mockRoundState = (state: string): OptionRoundStateType => ({
    roundState: state,
  } as OptionRoundStateType);

  it("returns Settled when selectedRoundState is undefined", () => {
    const { result } = renderHook(() => useRoundState({
      selectedRoundState: undefined,
      fossilStatus: null,
      fossilError: null,
      pendingTx: undefined,
      expectedNextState: null,
    }));
    expect(result.current.roundState).toBe("Settled");
  });

  it("returns Pending when transaction is pending", () => {
    const { result } = renderHook(() => useRoundState({
      selectedRoundState: mockRoundState("Open"),
      fossilStatus: null,
      fossilError: null,
      pendingTx: "0x123",
      expectedNextState: null,
    }));
    expect(result.current.roundState).toBe("Pending");
  });

  it("returns Pending when fossil status is Pending", () => {
    const { result } = renderHook(() => useRoundState({
      selectedRoundState: mockRoundState("Open"),
      fossilStatus: { status: "Pending" },
      fossilError: null,
      pendingTx: undefined,
      expectedNextState: null,
    }));
    expect(result.current.roundState).toBe("Pending");
  });

  it("returns current state for Open/Auctioning/Settled when matching expected state", () => {
    ["Open", "Auctioning", "Settled"].forEach(currentState => {
      const { result } = renderHook(() => useRoundState({
        selectedRoundState: mockRoundState(currentState),
        fossilStatus: null,
        fossilError: null,
        pendingTx: undefined,
        expectedNextState: currentState,
      }));
      expect(result.current.roundState).toBe(currentState);
    });
  });

  it("returns Pending when current state doesn't match expected next state", () => {
    const { result } = renderHook(() => useRoundState({
      selectedRoundState: mockRoundState("Open"),
      fossilStatus: null,
      fossilError: null,
      pendingTx: undefined,
      expectedNextState: "Auctioning",
    }));
    expect(result.current.roundState).toBe("Pending");
  });

  describe("Running state transitions", () => {
    it("returns Running when fossil status is Completed and not expecting Open", () => {
      const { result } = renderHook(() => useRoundState({
        selectedRoundState: mockRoundState("Running"),
        fossilStatus: { status: "Completed" },
        fossilError: null,
        pendingTx: undefined,
        expectedNextState: "Running",
      }));
      expect(result.current.roundState).toBe("Running");
    });

    it("returns Pending when fossil status is Completed and expecting Open", () => {
      const { result } = renderHook(() => useRoundState({
        selectedRoundState: mockRoundState("Running"),
        fossilStatus: { status: "Completed" },
        fossilError: null,
        pendingTx: undefined,
        expectedNextState: "Open",
      }));
      expect(result.current.roundState).toBe("Pending");
    });

    it("returns FossilReady when fossil status is Failed", () => {
      const { result } = renderHook(() => useRoundState({
        selectedRoundState: mockRoundState("Running"),
        fossilStatus: { status: "Failed" },
        fossilError: null,
        pendingTx: undefined,
        expectedNextState: null,
      }));
      expect(result.current.roundState).toBe("FossilReady");
    });

    it("returns FossilReady when there is a fossil error", () => {
      const { result } = renderHook(() => useRoundState({
        selectedRoundState: mockRoundState("Running"),
        fossilStatus: null,
        fossilError: "Some error",
        pendingTx: undefined,
        expectedNextState: null,
      }));
      expect(result.current.roundState).toBe("FossilReady");
    });

    it("returns FossilReady when fossil status is null", () => {
      const { result } = renderHook(() => useRoundState({
        selectedRoundState: mockRoundState("Running"),
        fossilStatus: null,
        fossilError: null,
        pendingTx: undefined,
        expectedNextState: null,
      }));
      expect(result.current.roundState).toBe("FossilReady");
    });

    it("tracks previous round state", () => {
      const { result, rerender } = renderHook(
        (props) => useRoundState(props),
        {
          initialProps: {
            selectedRoundState: mockRoundState("Open"),
            fossilStatus: null,
            fossilError: null,
            pendingTx: undefined,
            expectedNextState: null,
          }
        }
      );

      expect(result.current.roundState).toBe("Open");
      expect(result.current.prevRoundState).toBe("Open");

      rerender({
        selectedRoundState: mockRoundState("Auctioning"),
        fossilStatus: null,
        fossilError: null,
        pendingTx: undefined,
        expectedNextState: null,
      });

      expect(result.current.roundState).toBe("Auctioning");
      expect(result.current.prevRoundState).toBe("Open");
    });
  });
}); 