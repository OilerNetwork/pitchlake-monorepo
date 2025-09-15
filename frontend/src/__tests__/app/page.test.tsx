import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import useIsMobile from "@/hooks/window/useIsMobile";
import { useNetwork } from "@starknet-react/core";
import useWebSocketHome from "@/hooks/websocket/useWebSocketHome";

// Mock hooks
jest.mock("@/hooks/window/useIsMobile", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@starknet-react/core", () => ({
  useNetwork: jest.fn(),
}));

jest.mock("@/hooks/websocket/useWebSocketHome", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock environment variables
const originalEnv = process.env;

describe("Home Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_ENVIRONMENT = "ws";
    process.env.NEXT_PUBLIC_VAULT_ADDRESSES = "0x123,0x456";

    // Default mock values
    (useIsMobile as jest.Mock).mockReturnValue({ isMobile: false });
    (useNetwork as jest.Mock).mockReturnValue({
      chain: { network: "testnet" },
    });
    (useWebSocketHome as jest.Mock).mockReturnValue({
      vaults: ["0x123", "0x456"],
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Network handling", () => {
    it("renders mainnet warning when network is mainnet", () => {
      (useNetwork as jest.Mock).mockReturnValue({
        chain: { network: "mainnet" },
      });
      render(<Home />);

      expect(
        screen.getByText(/Mainnet is not yet released/),
      ).toBeInTheDocument();
    });

    it("renders content when network is testnet", () => {
      render(<Home />);

      expect(screen.getByText("Popular Vaults")).toBeInTheDocument();
    });
  });

  describe("Mobile handling", () => {
    it("renders mobile screen when on mobile device", () => {
      (useIsMobile as jest.Mock).mockReturnValue({ isMobile: true });
      render(<Home />);

      expect(screen.getByText("Device Not Supported")).toBeInTheDocument();
    });
  });

  describe("Vault rendering", () => {
    it("handles empty vault list gracefully", () => {
      (useWebSocketHome as jest.Mock).mockReturnValue({ vaults: [] });
      render(<Home />);

      expect(screen.getByText("Popular Vaults")).toBeInTheDocument();
      expect(screen.queryByRole("article")).not.toBeInTheDocument();
    });
  });
});
