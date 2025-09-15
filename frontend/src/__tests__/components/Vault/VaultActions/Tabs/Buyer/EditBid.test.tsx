import { act } from "react";
import { screen, fireEvent } from "@testing-library/react";
import EditBid from "@/components/Vault/VaultActions/Tabs/Buyer/EditBid";
import { renderWithProviders } from "@/__tests__/utils/TestWrapper";
import { useHelpContext } from "@/context/HelpProvider";

// Mock all external dependencies
jest.mock("@starknet-react/core", () => ({
  useAccount: () => ({ account: "0x123" }),
}));

jest.mock("@/context/TransactionProvider", () => ({
  useTransactionContext: () => ({
    pendingTx: null,
    setPendingTx: jest.fn(),
    setStatusModalProps: jest.fn(),
    updateStatusModalProps: jest.fn(),
  }),
}));

jest.mock("@/context/HelpProvider", () => ({
  useHelpContext: jest.fn().mockReturnValue({
    setActiveDataId: jest.fn(),
    activeDataId: null,
    isHelpBoxOpen: false,
    header: null,
    isHoveringHelpBox: false,
    content: null,
    setIsHoveringHelpBox: jest.fn(),
    toggleHelpBoxOpen: jest.fn(),
  }),
}));

jest.mock("@/hooks/vault_v2/states/useVaultState", () => ({
  __esModule: true,
  default: () => ({
    vaultState: { ethAddress: "0x456", address: "0x789" },
    selectedRoundAddress: "0xabc",
  }),
}));

jest.mock("@/hooks/vault_v2/states/useRoundState", () => ({
  __esModule: true,
  default: () => ({
    address: "0xabc",
    auctionEndDate: "2000",
  }),
}));

jest.mock("@/hooks/erc20/useErc20Balance", () => ({
  __esModule: true,
  default: () => ({ balance: "1000000000000000000000" }), // 1000 ETH
}));

jest.mock("@/hooks/erc20/useErc20Allowance", () => ({
  __esModule: true,
  default: () => ({ allowance: "1000000000000000000000" }), // 1000 ETH
}));

jest.mock("@/hooks/txn/useEditBidMulticall", () => ({
  __esModule: true,
  default: () => ({ handleMulticall: jest.fn().mockResolvedValue("0x123") }),
}));

// Mock TimeProvider with a mockTimestamp that can be updated
const mockTimeContext = {
  timestamp: 1000,
};

jest.mock("@/context/TimeProvider", () => ({
  useTimeContext: () => mockTimeContext,
}));

describe("EditBid", () => {
  const defaultProps = {
    onClose: jest.fn(),
    showConfirmation: jest.fn(),
    bidToEdit: {
      amount: "1",
      price: "1000000000", // 1 Gwei in Wei
      bid_id: "1",
    },
  };

  const renderComponent = async () => {
    let result;
    await act(async () => {
      result = renderWithProviders(<EditBid {...defaultProps} />);
    });
    return result!;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockTimeContext.timestamp = 1000; // Reset timestamp
  });

  it("shows error when new price is lower than current", async () => {
    const { container } = await renderComponent();
    const input = container.querySelector('[data-item="inputUpdateBidPrice"] input')!;
    
    fireEvent.change(input, { target: { value: "0.5" } });
    
    expect(screen.getByText("Bid price must increase")).toBeInTheDocument();
  });

  it("triggers confirmation when submitting valid bid", async () => {
    const { container } = await renderComponent();
    const input = container.querySelector('[data-item="inputUpdateBidPrice"] input')!;
    
    fireEvent.change(input, { target: { value: "2.0" } });
    fireEvent.click(screen.getByRole("button", { name: "Edit Bid" }));

    expect(defaultProps.showConfirmation).toHaveBeenCalled();
  });

  it("persists price input in localStorage", async () => {
    const { container } = await renderComponent();
    const input = container.querySelector('[data-item="inputUpdateBidPrice"] input')!;
    
    fireEvent.change(input, { target: { value: "2.0" } });

    expect(localStorage.getItem("editBidPriceGwei")).toBe("2.0");
  });

  it("shows auction ended message after end time", async () => {
    mockTimeContext.timestamp = 3000; // After auction end (2000)
    await renderComponent();

    expect(screen.getByText("Auction Ending")).toBeInTheDocument();
    expect(screen.getByText("No more bids can be placed.")).toBeInTheDocument();
  });
});
