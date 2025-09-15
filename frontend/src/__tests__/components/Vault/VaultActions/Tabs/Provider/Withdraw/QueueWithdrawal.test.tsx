import { render, screen, fireEvent } from "@testing-library/react";
import QueueWithdrawal from "@/components/Vault/VaultActions/Tabs/Provider/Withdraw/QueueWithdrawal";
import { useAccount } from "@starknet-react/core";
import { useTransactionContext } from "@/context/TransactionProvider";
import { useHelpContext } from "@/context/HelpProvider";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import useLPState from "@/hooks/vault_v2/states/useLPState";
import { parseEther } from "ethers";

// Mock the hooks
jest.mock("@starknet-react/core", () => ({
  useAccount: jest.fn(),
}));

jest.mock("@/hooks/vault_v2/actions/useVaultActions", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/hooks/vault_v2/states/useLPState", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/context/TransactionProvider", () => ({
  useTransactionContext: jest.fn(),
}));

jest.mock("@/context/HelpProvider", () => ({
  useHelpContext: jest.fn(),
}));

describe("QueueWithdrawal", () => {
  const mockShowConfirmation = jest.fn();
  const mockQueueWithdrawal = jest.fn();
  const mockSetStatusModalProps = jest.fn();
  const mockSetActiveDataId = jest.fn();

  const defaultMocks = {
    account: { address: "0x123" },
    lpState: {
      queuedBps: "0",
      lockedBalance: parseEther("10"), // 10 ETH
    },
    pendingTx: false,
  };

  const setupMocks = (overrides = {}) => {
    const mocks = { ...defaultMocks, ...overrides };

    (useAccount as jest.Mock).mockReturnValue({
      account: mocks.account,
    });

    (useVaultActions as jest.Mock).mockReturnValue({
      queueWithdrawal: mockQueueWithdrawal,
    });

    (useLPState as jest.Mock).mockReturnValue(mocks.lpState);

    (useTransactionContext as jest.Mock).mockReturnValue({
      pendingTx: mocks.pendingTx,
      setStatusModalProps: mockSetStatusModalProps,
    });

    (useHelpContext as jest.Mock).mockReturnValue({
      setActiveDataId: mockSetActiveDataId,
      activeDataId: null,
      isHelpBoxOpen: false,
      header: null,
      isHoveringHelpBox: false,
      content: null,
      setIsHoveringHelpBox: jest.fn(),
      toggleHelpBoxOpen: jest.fn(),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe("Initial Render", () => {
    it("renders with initial state", () => {
      render(<QueueWithdrawal showConfirmation={mockShowConfirmation} />);

      expect(screen.getByLabelText("Choose Percentage")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Queue" })).toBeDisabled();
      expect(screen.getByText("10 ETH")).toBeInTheDocument();
    });

    it("shows current queued percentage from lpState", () => {
      setupMocks({ lpState: { queuedBps: "5000", lockedBalance: parseEther("10") } });
      render(<QueueWithdrawal showConfirmation={mockShowConfirmation} />);

      const slider = screen.getByRole("slider");
      expect(slider).toHaveValue("50"); // 5000 BPS = 50%
    });
  });

  describe("Slider Interaction", () => {
    it("updates percentage when slider is moved", () => {
      render(<QueueWithdrawal showConfirmation={mockShowConfirmation} />);

      const slider = screen.getByRole("slider");
      fireEvent.change(slider, { target: { value: "50" } });

      expect(slider).toHaveValue("50");
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("enables queue button when percentage is changed", () => {
      render(<QueueWithdrawal showConfirmation={mockShowConfirmation} />);

      const slider = screen.getByRole("slider");
      fireEvent.change(slider, { target: { value: "50" } });

      expect(screen.getByRole("button", { name: "Queue" })).toBeEnabled();
    });
  });

  describe("Button States", () => {
    it("disables queue button when percentage is unchanged", () => {
      setupMocks({ lpState: { queuedBps: "5000", lockedBalance: parseEther("10") } });
      render(<QueueWithdrawal showConfirmation={mockShowConfirmation} />);

      const slider = screen.getByRole("slider");
      fireEvent.change(slider, { target: { value: "50" } }); // Same as queuedBps

      expect(screen.getByRole("button", { name: "Queue" })).toBeDisabled();
    });

    it("disables queue button when transaction is pending", () => {
      setupMocks({ pendingTx: true });
      render(<QueueWithdrawal showConfirmation={mockShowConfirmation} />);

      expect(screen.getByRole("button", { name: "Queue" })).toBeDisabled();
    });

    it("disables queue button when no account is connected", () => {
      setupMocks({ account: null });
      render(<QueueWithdrawal showConfirmation={mockShowConfirmation} />);

      expect(screen.getByRole("button", { name: "Queue" })).toBeDisabled();
    });
  });

  describe("Queue Withdrawal Flow", () => {
    it("shows confirmation modal with correct percentage values", async () => {
      render(<QueueWithdrawal showConfirmation={mockShowConfirmation} />);

      const slider = screen.getByRole("slider");
      fireEvent.change(slider, { target: { value: "50" } });

      const queueButton = screen.getByRole("button", { name: "Queue" });
      fireEvent.click(queueButton);

      expect(mockShowConfirmation).toHaveBeenCalledWith(
        "Liquidity Withdraw",
        expect.anything(),
        expect.any(Function)
      );
    });

    it("calls queueWithdrawal with correct BPS when confirmed", async () => {
      mockQueueWithdrawal.mockResolvedValue("0xtx");
      render(<QueueWithdrawal showConfirmation={mockShowConfirmation} />);

      const slider = screen.getByRole("slider");
      fireEvent.change(slider, { target: { value: "50" } });

      const queueButton = screen.getByRole("button", { name: "Queue" });
      fireEvent.click(queueButton);

      const onConfirm = mockShowConfirmation.mock.calls[0][2];
      await onConfirm();

      expect(mockQueueWithdrawal).toHaveBeenCalledWith({ bps: 5000 });
      expect(mockSetStatusModalProps).toHaveBeenCalledWith(expect.objectContaining({
        version: "success",
        txnHeader: "Withdraw Request Successful",
        txnHash: "0xtx",
      }));
    });

    it("handles queue withdrawal errors", async () => {
      mockQueueWithdrawal.mockRejectedValue(new Error("Failed to queue"));
      render(<QueueWithdrawal showConfirmation={mockShowConfirmation} />);

      const slider = screen.getByRole("slider");
      fireEvent.change(slider, { target: { value: "50" } });

      const queueButton = screen.getByRole("button", { name: "Queue" });
      fireEvent.click(queueButton);

      const onConfirm = mockShowConfirmation.mock.calls[0][2];
      await onConfirm();

      expect(mockSetStatusModalProps).toHaveBeenCalledWith(expect.objectContaining({
        version: "failure",
        txnHeader: "Withdrawal Request Failed",
      }));
    });
  });
}); 