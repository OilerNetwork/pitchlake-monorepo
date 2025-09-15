import { render, screen, fireEvent } from "@testing-library/react";
import { Vault } from "../../../components/Vault/Vault";
import useIsMobile from "../../../hooks/window/useIsMobile";
import { useRouter } from "next/navigation";
import { TestWrapper } from "../../utils/TestWrapper";
import { useNetwork } from "@starknet-react/core";
import { useHelpContext } from "@/context/HelpProvider";

// Mock the hooks
jest.mock("../../../hooks/window/useIsMobile", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock the HelpContext
jest.mock("@/context/HelpProvider", () => ({
  HelpProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

// Mock the child components
jest.mock("../../../components/Vault/VaultChart/Chart", () => ({
  __esModule: true,
  default: () => <div className="vault-chart">Chart</div>,
}));

jest.mock("../../../components/Vault/PanelLeft", () => ({
  __esModule: true,
  default: ({ userType }: { userType: string }) => (
    <div className={`panel-left-${userType}`}>Panel Left</div>
  ),
}));

jest.mock("../../../components/Vault/PanelRight", () => ({
  __esModule: true,
  default: ({
    userType,
    isEditOpen,
    setIsEditOpen,
  }: {
    userType: string;
    isEditOpen: boolean;
    setIsEditOpen: (value: boolean) => void;
  }) => <div className={`panel-right-${userType}`}>Panel Right</div>,
}));

jest.mock("../../../components/BaseComponents/MobileScreen", () => ({
  __esModule: true,
  default: () => <div className="mobile-screen">Mobile Screen</div>,
}));

jest.mock("@starknet-react/core", () => ({
  useNetwork: jest.fn(),
  useContractRead: () => ({
    data: "1000000000000000000",
    isError: false,
    isLoading: false,
  }),
  useProvider: () => ({
    provider: {
      getBlock: jest.fn(),
    },
  }),
  useAccount: () => ({
    account: {
      address: "0x123"
    }
  }),
  useContract: () => ({
    data: null,
  }),
}));

jest.mock("@/context/ChartProvider", () => ({
  ChartProvider: ({ children }: { children: React.ReactNode }) => (
    <div className="chart-provider">{children}</div>
  ),
}));

describe("Vault Component", () => {
  const mockRouter = {
    push: jest.fn(),
  };
  const mockSetActiveDataId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useIsMobile as jest.Mock).mockReturnValue({ isMobile: false });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
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
  });

  it("renders mainnet warning when network is mainnet", () => {
    (useNetwork as jest.Mock).mockReturnValue({
      chain: { network: "mainnet" },
    });

    render(
      <TestWrapper>
        <Vault />
      </TestWrapper>,
    );

    expect(screen.getByText(/Mainnet is not yet released/)).toBeInTheDocument();
  });

  it("renders desktop layout when not mobile", () => {
    (useNetwork as jest.Mock).mockReturnValue({
      chain: { network: "sepolia" },
    });

    render(
      <TestWrapper>
        <Vault />
      </TestWrapper>,
    );

    // Check initial desktop layout
    const chart = screen.getByText("Chart");
    const leftPanel = screen.getByText("Panel Left");
    const rightPanel = screen.getByText("Panel Right");

    expect(chart).toBeInTheDocument();
    expect(leftPanel).toBeInTheDocument();
    expect(rightPanel).toBeInTheDocument();

    // Test view switching
    const buyerTab = document.querySelector(".buyer-tab");
    if (!buyerTab) throw new Error("Buyer tab not found");
    fireEvent.click(buyerTab);

    expect(screen.getByText("Panel Left")).toBeInTheDocument();
    expect(screen.getByText("Panel Right")).toBeInTheDocument();

    // Test back navigation
    const backButton = document.querySelector(".back-button-container");
    if (!backButton) throw new Error("Back button not found");
    fireEvent.click(backButton.querySelector(".back-button")!);
    expect(mockRouter.push).toHaveBeenCalledWith("/");
  });

  it("renders mobile layout when mobile", () => {
    (useIsMobile as jest.Mock).mockReturnValue({ isMobile: true });
    render(
      <TestWrapper>
        <Vault />
      </TestWrapper>,
    );
    expect(screen.getByText("Mobile Screen")).toBeInTheDocument();
  });
});

