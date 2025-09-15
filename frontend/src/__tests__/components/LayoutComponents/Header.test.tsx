import { render, screen, fireEvent } from "@testing-library/react";
import Header from "../../../components/LayoutComponents/Header";
import useIsMobile from "../../../hooks/window/useIsMobile";
import { useAccount, useConnect } from "@starknet-react/core";
import { useNewContext } from "@/context/NewProvider";
import { useUiContext } from "@/context/UiProvider";
import { useHelpContext } from "@/context/HelpProvider";

// Mock SVG imports
jest.mock("@/../public/logo_full.svg", () => "logo_full");
jest.mock("@/../public/login.svg", () => "login");
jest.mock("@/../public/braavos.svg", () => "braavos");
jest.mock("@/../public/argent.svg", () => "argent");
jest.mock("@/../public/keplr.svg", () => "keplr");
jest.mock("@/../public/avatar.svg", () => "avatar");

// Mock next/image
jest.mock("next/image", () => {
  const MockImage = ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} />
  );
  MockImage.displayName = "Image";
  return MockImage;
});

// Mock hooks
jest.mock("@starknet-react/core", () => ({
  useAccount: jest.fn().mockReturnValue({
    account: undefined,
    address: undefined,
    isConnecting: false,
    isConnected: false,
    isDisconnected: true,
    status: "disconnected",
  }),
  useDisconnect: jest.fn().mockReturnValue({
    disconnect: jest.fn(),
  }),
  useConnect: jest.fn().mockReturnValue({
    connect: jest.fn(),
    connectors: [
      { id: "braavos", name: "Braavos" },
      { id: "argent", name: "Argent" },
      { id: "keplr", name: "Keplr" },
    ],
  }),
  useNetwork: jest.fn().mockReturnValue({
    chain: {
      id: "SN_GOERLI",
      network: "testnet",
    },
    chains: [
      { id: "SN_GOERLI", network: "testnet" },
      { id: "SN_MAIN", network: "mainnet" },
    ],
  }),
  useContractRead: jest.fn().mockReturnValue({
    data: "0",
    isError: false,
    isLoading: false,
  }),
}));

// Mock other hooks
jest.mock("../../../hooks/window/useIsMobile", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({ isMobile: false }),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
  }),
  usePathname: jest.fn().mockReturnValue("/"),
}));

jest.mock("@/hooks/erc20/useErc20Balance", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    balance: "1000000000000000000", // 1 ETH
  }),
}));

jest.mock("@/context/HelpProvider", () => {
  const mockSetActiveDataId = jest.fn();
  return {
    useHelpContext: jest.fn().mockReturnValue({
      setActiveDataId: mockSetActiveDataId,
      activeDataId: null,
      isHelpBoxOpen: false,
      toggleHelpBoxOpen: jest.fn(),
      header: null,
      content: null,
      isHoveringHelpBox: false,
      setIsHoveringHelpBox: jest.fn(),
    }),
  };
});

jest.mock("@/context/UiProvider", () => ({
  useUiContext: jest.fn().mockReturnValue({
    isBlurOpen: false,
    setBlurOpen: jest.fn(),
    isWalletLoginOpen: false,
    closeWalletLogin: jest.fn(),
    walletLoginRef: { current: null },
    toggleWalletLogin: jest.fn(),
  }),
}));

jest.mock("@/context/NewProvider", () => ({
  useNewContext: jest.fn().mockReturnValue({
    conn: "mock",
  }),
}));

jest.mock("@/context/TimeProvider", () => ({
  useTimeContext: jest.fn().mockReturnValue({
    timestamp: 1234567890,
    mockTimeForward: jest.fn(),
  }),
}));

jest.mock("@/hooks/vault_v2/states/useLPState", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    lockedBalance: "500000000000000000",
    unlockedBalance: "300000000000000000",
    stashedBalance: "200000000000000000",
  }),
}));

jest.mock("@/hooks/vault_v2/states/useVaultState", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    vaultState: {
      address: "0x123",
      alpha: "0",
      strikeLevel: "0",
      ethAddress: "0x0",
      l1DataProcessorAddress: "0x0",
      currentRoundId: "0",
      lockedBalance: "0",
      unlockedBalance: "0",
      stashedBalance: "0",
      queuedBps: "0",
      vaultType: "ATM",
      deploymentDate: "0",
      currentRoundAddress: "0x0",
    },
    selectedRoundAddress: "0x0",
  }),
}));

interface MockOverrides {
  mockTime?: boolean;
  conn?: string;
  timestamp?: number;
  isConnected?: boolean;
  address?: string;
  isConnecting?: boolean;
  account?: { address: string } | undefined;
  isMobile?: boolean;
}

const mockHooks = (overrides: MockOverrides = {}) => {
  const {
    isConnected = false,
    address = undefined,
    isConnecting = false,
    account = undefined,
    conn = undefined,
    isMobile = false,
  } = overrides;

  (useIsMobile as jest.Mock).mockReturnValue({ isMobile });

  (useAccount as jest.Mock).mockReturnValue({
    account: isConnected
      ? { address: address || "0x0123456789abcdef0123456789abcdef01234567" }
      : undefined,
    address: isConnected
      ? address || "0x0123456789abcdef0123456789abcdef01234567"
      : undefined,
    isConnecting,
    isConnected,
    isDisconnected: !isConnected,
    status: isConnected ? "connected" : "disconnected",
  });

  if (conn) {
    (useNewContext as jest.Mock).mockReturnValue({
      conn,
    });
  }

  // Reset the mockSetActiveDataId function for each test
  const mockSetActiveDataId = jest.fn();
  (useHelpContext as jest.Mock).mockReturnValue({
    setActiveDataId: mockSetActiveDataId,
    activeDataId: null,
    isHelpBoxOpen: false,
    toggleHelpBoxOpen: jest.fn(),
    header: null,
    content: null,
    isHoveringHelpBox: false,
    setIsHoveringHelpBox: jest.fn(),
  });
};

// Common test setup helper
const renderHeader = (overrides: MockOverrides = {}) => {
  mockHooks(overrides);
  return render(<Header />);
};

describe("Header Component", () => {
  beforeEach(() => {
    mockHooks();
  });

  it("renders header with navigation and interaction elements", () => {
    const { container } = renderHeader();

    // Check header container
    const header = container.querySelector("nav");
    expect(header).toBeInTheDocument();

    // Check logo
    const logo = container.querySelector("img");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "logo_full");
    expect(logo).toHaveAttribute("alt", "Pitchlake logo");

    // Check network selector
    const networkSelector = screen.getByText("Testnet");
    expect(networkSelector).toBeInTheDocument();
  });

  it("handles connect wallet flow", () => {
    const mockToggleWalletLogin = jest.fn();
    (useUiContext as jest.Mock).mockReturnValue({
      isWalletLoginOpen: true,
      closeWalletLogin: jest.fn(),
      walletLoginRef: { current: null },
      toggleWalletLogin: mockToggleWalletLogin,
    });

    renderHeader({
      isConnected: false,
      address: undefined,
      isConnecting: false,
      account: undefined,
    });

    // Check initial connect button
    const connectButton = screen.getByText("Connect");
    expect(connectButton).toBeInTheDocument();

    // Open wallet selection dropdown
    fireEvent.click(connectButton);
    expect(mockToggleWalletLogin).toHaveBeenCalled();

    // Check wallet options
    const walletOptions = ["BRAAVOS", "ARGENT", "KEPLR"];
    walletOptions.forEach((wallet) => {
      expect(screen.getByText(wallet)).toBeInTheDocument();
    });

    // Check wallet selection
    const braavosOption = screen.getByText("BRAAVOS");
    fireEvent.click(braavosOption);
    const mockConnect = useConnect().connect;
    expect(mockConnect).toHaveBeenCalledWith({
      connector: { id: "braavos", name: "Braavos" },
    });
  });

  it("displays profile dropdown when connected", () => {
    renderHeader({
      isConnected: true,
      address: "0x0123456789abcdef0123456789abcdef01234567",
      isConnecting: false,
    });

    // Check profile button
    const profileButton = screen.getByText("0x0123...4567");
    expect(profileButton).toBeInTheDocument();

    // Check dropdown is initially closed
    expect(screen.queryByText("MY BALANCE")).not.toBeInTheDocument();

    // Open dropdown
    fireEvent.click(profileButton);

    // Check dropdown contents
    //expect(screen.getByText("MY BALANCE")).toBeInTheDocument();
    //expect(screen.getByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });

  it("handles mock time controls when in mock connection", () => {
    renderHeader({ conn: "mock", mockTime: true });

    const mockTimeButton = screen.getByText("Forward Mock Time");
    expect(mockTimeButton).toBeInTheDocument();

    fireEvent.click(mockTimeButton);
  });

  it("handles network display", () => {
    renderHeader();

    // Check network selector button
    const networkButton = screen.getByRole("button", { name: /testnet/i });
    expect(networkButton).toBeInTheDocument();
    expect(networkButton).toBeDisabled();

    // Since the button is disabled, we can't test the dropdown
    // But we can verify the current network is displayed correctly
    expect(screen.getByText("Testnet")).toBeInTheDocument();
  });

  it("displays connect button when not connected", () => {
    renderHeader({
      isConnected: false,
      address: undefined,
      isConnecting: false,
      account: undefined,
    });

    const connectButton = screen.getByText("Connect");
    expect(connectButton).toBeInTheDocument();
  });

  it("does not render anything on mobile", () => {
    const { container } = renderHeader({ isMobile: true });
    expect(container.firstChild).toBeFalsy();
  });
});
