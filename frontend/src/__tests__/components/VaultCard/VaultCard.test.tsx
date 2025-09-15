import { render, screen, fireEvent } from "@testing-library/react";
import VaultCard from "@/components/VaultCard/VaultCard";
import { useRouter } from "next/navigation";
import { useNewContext } from "@/context/NewProvider";
import { useTimeContext } from "@/context/TimeProvider";
import useVaultStateRPC from "@/hooks/vault_v2/rpc/useVaultStateRPC";
import useOptionRoundStateRPC from "@/hooks/vault_v2/rpc/useOptionRoundStateRPC";

jest.mock("@starknet-react/core", () => ({
  useProvider: () => ({
    provider: {}
  }),
  useAccount: () => ({
    account: {}
  }),
  useContractRead: () => ({
    data: {}
  })
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn()
}));

jest.mock("@/context/NewProvider");
jest.mock("@/context/TimeProvider");
jest.mock("@/hooks/vault_v2/rpc/useVaultStateRPC");
jest.mock("@/hooks/vault_v2/rpc/useOptionRoundStateRPC");

describe("VaultCard", () => {
  const mockRouter = {
    push: jest.fn()
  };

  const mockSetSelectedRound = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useNewContext as jest.Mock).mockReturnValue({
      setSelectedRound: mockSetSelectedRound,
      conn: "testnet"
    });
    (useTimeContext as jest.Mock).mockReturnValue({
      timestamp: "1234567800"
    });
    (useVaultStateRPC as jest.Mock).mockReturnValue({
      vaultState: {
        vaultType: "Call",
        currentRoundId: "1",
        currentRoundAddress: "0x456",
        lockedBalance: "100000000000000000",
        unlockedBalance: "200000000000000000"
      }
    });
    (useOptionRoundStateRPC as jest.Mock).mockReturnValue({
      roundState: "Open",
      capLevel: "1000",
      strikePrice: "2000000000",
      reservePrice: "100000000",
      clearingPrice: "0",
      soldLiquidity: "1000000000",
      premiums: "100000000",
      totalPayout: "50000000",
      auctionStartDate: "1234567890",
      auctionEndDate: "1234567899",
      optionSettleDate: "1234567999"
    });
  });

  it("navigates to vault details on click", () => {
    render(<VaultCard vaultAddress="0x123" />);
    const card = screen.getByTestId("vault-card");
    fireEvent.click(card);
    expect(mockRouter.push).toHaveBeenCalledWith("/vaults/0x123");
    expect(mockSetSelectedRound).toHaveBeenCalledWith(1);
  });

  it("displays loading state when data is not available", () => {
    (useOptionRoundStateRPC as jest.Mock).mockReturnValue({
      roundState: "",
      capLevel: "0",
      strikePrice: "0",
      reservePrice: "0",
      clearingPrice: "0",
      soldLiquidity: "0",
      premiums: "0",
      totalPayout: "0",
      auctionStartDate: "0",
      auctionEndDate: "0",
      optionSettleDate: "0"
    });
    
    render(<VaultCard vaultAddress="0x123" />);
    
    expect(screen.getByTestId("vault-cap")).toHaveTextContent("0 Gwei");
    expect(screen.getByTestId("vault-strike")).toHaveTextContent("Loading...");
    expect(screen.getByTestId("vault-duration")).toHaveTextContent("Loading...");
    expect(screen.getByTestId("vault-time-value")).toHaveTextContent("Loading...");
  });

  it("displays formatted values when data is available", () => {
    render(<VaultCard vaultAddress="0x123" />);
    
    expect(screen.getByTestId("vault-cap")).toHaveTextContent("2.20 Gwei");
    expect(screen.getByTestId("vault-strike")).toHaveTextContent("2.00 GWEI");
    expect(screen.getByTestId("vault-tvl")).toHaveTextContent("0.3 ETH");
    expect(screen.getByTestId("vault-type")).toHaveTextContent("Call");
  });

  it("displays correct time-related information for different states", () => {
    // Test Open state
    (useOptionRoundStateRPC as jest.Mock).mockReturnValue({
      roundState: "Open",
      capLevel: "1000",
      strikePrice: "2000000000",
      reservePrice: "100000000",
      clearingPrice: "0",
      soldLiquidity: "1000000000",
      premiums: "100000000",
      totalPayout: "50000000",
      auctionStartDate: "1234567890",
      auctionEndDate: "1234567899",
      optionSettleDate: "1234567999"
    });
    const { rerender } = render(<VaultCard vaultAddress="0x123" />);
    expect(screen.getByTestId("vault-time-label")).toHaveTextContent("AUCTION STARTS");
    
    // Test Auctioning state
    (useOptionRoundStateRPC as jest.Mock).mockReturnValue({
      roundState: "Auctioning",
      capLevel: "1000",
      strikePrice: "2000000000",
      reservePrice: "100000000",
      clearingPrice: "0",
      soldLiquidity: "1000000000",
      premiums: "100000000",
      totalPayout: "50000000",
      auctionStartDate: "1234567890",
      auctionEndDate: "1234567899",
      optionSettleDate: "1234567999"
    });
    rerender(<VaultCard vaultAddress="0x123" />);
    expect(screen.getByTestId("vault-time-label")).toHaveTextContent("AUCTION ENDS");

    // Test Active state
    (useOptionRoundStateRPC as jest.Mock).mockReturnValue({
      roundState: "Running",
      capLevel: "1000",
      strikePrice: "2000000000",
      reservePrice: "100000000",
      clearingPrice: "0",
      soldLiquidity: "1000000000",
      premiums: "100000000",
      totalPayout: "50000000",
      auctionStartDate: "1234567890",
      auctionEndDate: "1234567899",
      optionSettleDate: "1234567999"
    });
    rerender(<VaultCard vaultAddress="0x123" />);
    expect(screen.getByTestId("vault-time-label")).toHaveTextContent("ROUND SETTLES");
  });
});
