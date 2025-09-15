import { renderHook, act } from "@testing-library/react";
import useIsMobile from "@/hooks/window/useIsMobile";

describe("useIsMobile", () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Reset window.innerWidth to its original value
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  afterEach(() => {
    // Clean up event listeners
    jest.restoreAllMocks();
  });

  it("initializes with correct mobile state based on window width", () => {
    // Set initial window width to mobile size (less than 834px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current.isMobile).toBe(true);

    // Set window width to desktop size (greater than 834px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    const { result: desktopResult } = renderHook(() => useIsMobile());
    expect(desktopResult.current.isMobile).toBe(false);
  });

  it("updates mobile state when window is resized", () => {
    // Start with desktop size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current.isMobile).toBe(false);

    // Simulate resize to mobile size
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isMobile).toBe(true);

    // Simulate resize back to desktop size
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1000,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isMobile).toBe(false);
  });

  it("removes event listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
  });

  it("uses correct breakpoint value", () => {
    // Test just below breakpoint (834px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 833,
    });

    const { result: mobileResult } = renderHook(() => useIsMobile());
    expect(mobileResult.current.isMobile).toBe(true);

    // Test at breakpoint
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 834,
    });

    const { result: desktopResult } = renderHook(() => useIsMobile());
    expect(desktopResult.current.isMobile).toBe(false);
  });
}); 