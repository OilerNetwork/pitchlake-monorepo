import { renderHook } from "@testing-library/react";
import useVaultBalances from "@/hooks/vault/state/useVaultBalances";
import { useContractRead } from "@starknet-react/core";
import { BlockTag } from "starknet";
import { vaultABI } from "@/lib/abi";

// Mock dependencies
jest.mock("@starknet-react/core", () => ({
  useContractRead: jest.fn()
}));

describe("useVaultBalances", () => {
  // Test data
  const mockAddress = "0x456";
  const mockBalances = {
    lockedBalance: BigInt(1000),
    unlockedBalance: BigInt(2000),
    stashedBalance: BigInt(3000)
  };

  // Mock contract read setup helper
  const mockContractRead = (config: {
    data?: bigint;
    watch?: boolean;
  }) => {
    return {
      data: config.data,
      watch: config.watch ?? false
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("balance retrieval", () => {
    it("returns formatted balances when all values are available", () => {
      // Setup mocks for each balance in sequence
      (useContractRead as jest.Mock)
        .mockReturnValueOnce(mockContractRead({ data: mockBalances.lockedBalance }))
        .mockReturnValueOnce(mockContractRead({ data: mockBalances.unlockedBalance }))
        .mockReturnValueOnce(mockContractRead({ data: mockBalances.stashedBalance }));

      // Execute
      const { result } = renderHook(() => useVaultBalances(mockAddress));

      // Verify returned balances
      expect(result.current).toEqual({
        lockedBalance: mockBalances.lockedBalance.toString(),
        unlockedBalance: mockBalances.unlockedBalance.toString(),
        stashedBalance: mockBalances.stashedBalance.toString(),
      });

      // Verify contract read parameters
      expect(useContractRead).toHaveBeenNthCalledWith(1, {
        abi: vaultABI,
        address: mockAddress,
        
        watch: false,
        functionName: "get_vault_locked_balance",
        args: [],
      });

      expect(useContractRead).toHaveBeenNthCalledWith(2, {
        abi: vaultABI,
        address: mockAddress,
        
        watch: false,
        functionName: "get_vault_unlocked_balance",
        args: [],
      });

      expect(useContractRead).toHaveBeenNthCalledWith(3, {
        abi: vaultABI,
        address: mockAddress,
        
        watch: false,
        functionName: "get_vault_stashed_balance",
        args: [],
      });
    });

    it("returns zero balances when contract reads return undefined", () => {
      // Setup mocks to return undefined
      (useContractRead as jest.Mock).mockReturnValue(mockContractRead({ data: undefined }));

      // Execute
      const { result } = renderHook(() => useVaultBalances(mockAddress));

      // Verify
      expect(result.current).toEqual({
        lockedBalance: 0,
        unlockedBalance: 0,
        stashedBalance: 0,
      });
    });

    it("returns zero balances when address is undefined", () => {
      // Execute
      const { result } = renderHook(() => useVaultBalances(undefined));

      // Verify
      expect(result.current).toEqual({
        lockedBalance: 0,
        unlockedBalance: 0,
        stashedBalance: 0,
      });
    });
  });

  describe("watch configuration", () => {
    it("respects watch parameter for all contract reads", () => {
      // Setup
      (useContractRead as jest.Mock)
        .mockReturnValueOnce(mockContractRead({ data: mockBalances.lockedBalance, watch: true }))
        .mockReturnValueOnce(mockContractRead({ data: mockBalances.unlockedBalance, watch: true }))
        .mockReturnValueOnce(mockContractRead({ data: mockBalances.stashedBalance, watch: true }));

      // Execute
      renderHook(() => useVaultBalances(mockAddress, { watch: true }));

      // Verify watch parameter for each call
      const calls = (useContractRead as jest.Mock).mock.calls;
      calls.forEach(call => {
        expect(call[0].watch).toBe(true);
      });
    });
  });
}); 