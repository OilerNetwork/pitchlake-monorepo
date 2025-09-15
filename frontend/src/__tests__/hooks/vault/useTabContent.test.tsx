import { renderHook } from "@testing-library/react";
import { useTabContent } from "@/hooks/vault/useTabContent";
import { useTransactionContext } from "@/context/TransactionProvider";
import { ProviderTabs, BuyerTabs, OptionRoundStateType } from "@/lib/types";

// Mock the hooks and components
jest.mock("@/context/TransactionProvider", () => ({
  useTransactionContext: jest.fn(),
}));

// Mock all the tab content components
jest.mock("@/components/Vault/VaultActions/Tabs/Provider/Deposit", () => ({
  __esModule: true,
  default: () => "DepositContent",
}));

jest.mock("@/components/Vault/VaultActions/Tabs/Provider/Withdraw/Withdraw", () => ({
  __esModule: true,
  default: () => "Withdraw",
}));

jest.mock("@/components/Vault/VaultActions/Tabs/Buyer/PlaceBid", () => ({
  __esModule: true,
  default: () => "PlaceBid",
}));

jest.mock("@/components/Vault/VaultActions/Tabs/Buyer/Mint", () => ({
  __esModule: true,
  default: () => "Mint",
}));

jest.mock("@/components/Vault/VaultActions/Tabs/Buyer/History", () => ({
  __esModule: true,
  default: () => "History",
}));

jest.mock("@/components/Vault/VaultActions/Tabs/Buyer/Exercise", () => ({
  __esModule: true,
  default: () => "Exercise",
}));

jest.mock("@/components/Vault/VaultActions/Tabs/Buyer/Refund", () => ({
  __esModule: true,
  default: () => "Refund",
}));

jest.mock("@/components/Vault/VaultActions/Tabs/Provider/MyInfo", () => ({
  __esModule: true,
  default: () => "MyInfo",
}));

describe("useTabContent", () => {
  const mockSetIsTabsHidden = jest.fn();
  const mockSetBidToEdit = jest.fn();
  const mockVaultState = {
    roundState: "Open",
  } as OptionRoundStateType;

  beforeEach(() => {
    jest.clearAllMocks();
    (useTransactionContext as jest.Mock).mockReturnValue({
      pendingTx: undefined,
    });
  });

  describe("Provider Tabs", () => {
    it("returns Deposit content for Deposit tab", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "lp",
          ProviderTabs.Deposit,
          mockVaultState,
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabContent).toBeDefined();
    });

    it("returns Withdraw content for Withdraw tab", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "lp",
          ProviderTabs.Withdraw,
          mockVaultState,
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabContent).toBeDefined();
    });

    it("returns MyInfo content for MyInfo tab", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "lp",
          "MyInfo",
          mockVaultState,
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabContent).toBeDefined();
    });
  });

  describe("Buyer Tabs", () => {
    it("returns PlaceBid content for PlaceBid tab", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "ob",
          BuyerTabs.PlaceBid,
          { ...mockVaultState, roundState: "Auctioning" },
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabContent).toBeDefined();
    });

    it("returns Mint content for Mint tab", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "ob",
          BuyerTabs.Mint,
          { ...mockVaultState, roundState: "Running" },
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabContent).toBeDefined();
    });

    it("returns Exercise content for Exercise tab", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "ob",
          BuyerTabs.Exercise,
          { ...mockVaultState, roundState: "Settled" },
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabContent).toBeDefined();
    });

    it("returns Refund content for Refund tab", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "ob",
          BuyerTabs.Refund,
          { ...mockVaultState, roundState: "Running" },
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabContent).toBeDefined();
    });

    it("returns History content for History tab", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "ob",
          BuyerTabs.History,
          { ...mockVaultState, roundState: "Running" },
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabContent).toBeDefined();
    });
  });

  describe("Tab Lists", () => {
    it("returns provider tabs for LP user", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "lp",
          ProviderTabs.Deposit,
          mockVaultState,
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabs).toContain(ProviderTabs.Deposit);
      expect(result.current.tabs).toContain(ProviderTabs.Withdraw);
    });

    it("returns empty tabs for buyer in Open state", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "ob",
          BuyerTabs.PlaceBid,
          { ...mockVaultState, roundState: "Open" },
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabs).toHaveLength(0);
    });

    it("returns correct tabs for buyer in Auctioning state", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "ob",
          BuyerTabs.PlaceBid,
          { ...mockVaultState, roundState: "Auctioning" },
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabs).toContain(BuyerTabs.PlaceBid);
      expect(result.current.tabs).toContain(BuyerTabs.History);
    });

    it("returns correct tabs for buyer in Running state", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "ob",
          BuyerTabs.Mint,
          { ...mockVaultState, roundState: "Running" },
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabs).toContain(BuyerTabs.Mint);
      expect(result.current.tabs).toContain(BuyerTabs.Refund);
      expect(result.current.tabs).toContain(BuyerTabs.History);
    });

    it("returns correct tabs for buyer in Settled state", () => {
      const { result } = renderHook(() =>
        useTabContent(
          "ob",
          BuyerTabs.Exercise,
          { ...mockVaultState, roundState: "Settled" },
          false,
          {},
          [],
          mockSetIsTabsHidden,
          mockSetBidToEdit
        )
      );

      expect(result.current.tabs).toContain(BuyerTabs.Exercise);
      expect(result.current.tabs).toContain(BuyerTabs.Refund);
      expect(result.current.tabs).toContain(BuyerTabs.History);
    });
  });
}); 