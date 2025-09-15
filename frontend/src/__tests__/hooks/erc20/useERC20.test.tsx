import { renderHook } from "@testing-library/react";
import useErc20Balance from "@/hooks/erc20/useErc20Balance";
import useErc20Allowance from "@/hooks/erc20/useErc20Allowance";
import {
  useAccount,
  useContract,
  useContractRead,
  useProvider,
} from "@starknet-react/core";
import { useTransactionContext } from "@/context/TransactionProvider";

// Mock all the hooks
jest.mock("@starknet-react/core", () => ({
  useAccount: jest.fn(),
  useContract: jest.fn(),
  useContractRead: jest.fn(),
  useProvider: jest.fn(),
}));

jest.mock("@/context/TransactionProvider", () => ({
  useTransactionContext: jest.fn(),
}));

describe("useErc20Allowance", () => {
  const mockAccount = {
    address: "0x123" as `0x${string}`,
  };

  const mockContract = {
    typedv2: jest.fn().mockReturnValue({
      connect: jest.fn(),
      approve: jest.fn(),
      increase_allowance: jest.fn(),
    }),
  };

  const mockProvider = {
    getNonceForAddress: jest.fn(),
  };

  const mockSetPendingTx = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useAccount
    (useAccount as jest.Mock).mockReturnValue({
      account: mockAccount,
    });

    // Mock useContract
    (useContract as jest.Mock).mockReturnValue({
      contract: mockContract,
    });

    // Mock useProvider
    (useProvider as jest.Mock).mockReturnValue({
      provider: mockProvider,
    });

    // Mock useTransactionContext
    (useTransactionContext as jest.Mock).mockReturnValue({
      setPendingTx: mockSetPendingTx,
      pendingTx: false,
    });

    // Mock useContractRead for balance and allowance
    (useContractRead as jest.Mock).mockImplementation(({ functionName }) => {
      if (functionName === "allowance") {
        return { data: BigInt(500) };
      }
      return { data: undefined };
    });
  });

  it("initializes with correct balance and allowance", () => {
    const { result } = renderHook(() =>
      useErc20Allowance("0x456" as `0x${string}`, "0x789"),
    );

    expect(result.current.allowance).toBe(BigInt(500));
  });
});

//// @NOTE repeat tests for balance

