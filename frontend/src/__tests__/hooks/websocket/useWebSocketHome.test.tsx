import { renderHook, act } from "@testing-library/react";
import useWebSocketHome from "@/hooks/websocket/useWebSocketHome";

// Mock WebSocket
class MockWebSocket implements WebSocket {
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent<any>) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  close = jest.fn();

  // Required WebSocket properties
  binaryType: BinaryType = 'blob';
  bufferedAmount: number = 0;
  extensions: string = '';
  protocol: string = '';
  readyState: number = WebSocket.CONNECTING;
  url: string = '';
  CLOSED: typeof WebSocket.CLOSED = WebSocket.CLOSED;
  CLOSING: typeof WebSocket.CLOSING = WebSocket.CLOSING;
  CONNECTING: typeof WebSocket.CONNECTING = WebSocket.CONNECTING;
  OPEN: typeof WebSocket.OPEN = WebSocket.OPEN;
  send = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();

  constructor(url: string) {
    this.url = url;
  }

  // Helper method to simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage) {
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(data),
        origin: this.url,
        lastEventId: '',
        source: null,
        ports: [],
      });
      this.onmessage(messageEvent);
    }
  }

  // Helper method to simulate connection open
  simulateOpen() {
    if (this.onopen) {
      const event = new Event('open');
      this.onopen(event);
    }
  }

  // Helper method to simulate error
  simulateError(error: any) {
    if (this.onerror) {
      const event = new Event('error');
      this.onerror(event);
    }
  }

  // Helper method to simulate connection close
  simulateClose() {
    if (this.onclose) {
      const closeEvent = new CloseEvent('close', {
        wasClean: true,
        code: 1000,
        reason: '',
      });
      this.onclose(closeEvent);
    }
  }
}

// Mock the WebSocket constructor
global.WebSocket = MockWebSocket as any;

describe("useWebSocketHome", () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockWs = new MockWebSocket("");
    jest.spyOn(global, "WebSocket").mockImplementation(() => mockWs);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("initializes WebSocket connection after component is loaded", () => {
    const { result } = renderHook(() => useWebSocketHome());

    // WebSocket should be initialized with correct URL
    expect(WebSocket).toHaveBeenCalledWith(
      expect.stringContaining("/subscribeHome")
    );
  });

  it("updates vaults when receiving WebSocket message", () => {
    const { result } = renderHook(() => useWebSocketHome());

    // Simulate component load
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Simulate receiving a message
    act(() => {
      mockWs.simulateMessage({
        vaultAddresses: ["0x123", "0x456"],
      });
    });

    // Check if vaults state is updated
    expect(result.current.vaults).toEqual(["0x123", "0x456"]);
  });

  it("handles WebSocket connection events", () => {
    // Spy on console methods
    const consoleSpy = jest.spyOn(console, "log");
    const consoleErrorSpy = jest.spyOn(console, "error");

    const { result } = renderHook(() => useWebSocketHome());

    // Simulate component load
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Simulate connection open
    act(() => {
      mockWs.simulateOpen();
    });
    expect(consoleSpy).toHaveBeenCalledWith("WebSocket connection established");

    // Simulate error
    act(() => {
      mockWs.simulateError(new Event('error'));
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "WebSocket error:",
      expect.any(Event)
    );

    // Simulate connection close
    act(() => {
      mockWs.simulateClose();
    });
    expect(consoleSpy).toHaveBeenCalledWith("WebSocket connection closed");
  });

  it("closes WebSocket connection on unmount", () => {
    const { unmount } = renderHook(() => useWebSocketHome());

    // Simulate component load
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Unmount the component
    unmount();

    // Check if close was called
    expect(mockWs.close).toHaveBeenCalled();
  });
}); 