import { render, screen, fireEvent } from "@testing-library/react";
import ProfileDropdown from "../../../components/BaseComponents/ProfileDropdown";
import { useHelpContext } from "@/context/HelpProvider";

// Mock the hooks
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
    setHelpContent: jest.fn(),
    clearHelpContent: jest.fn(),
  }),
}));

// Mock the icons
jest.mock("lucide-react", () => ({
  CopyIcon: () => <div className="copy-icon" />,
  LogOutIcon: () => <div className="logout-icon" />,
}));

describe("ProfileDropdown Component", () => {
  const mockProps = {
    account: {
      address: "0x123456789abcdef",
    },
    balance: {
      wallet: "1.000",
      locked: "0.500",
      unlocked: "0.300",
      stashed: "0.200",
    },
    disconnect: jest.fn(),
    copyToClipboard: jest.fn(),
  };

  const mockSetActiveDataId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useHelpContext as jest.Mock).mockReturnValue({
      setActiveDataId: mockSetActiveDataId,
      activeDataId: null,
      isHelpBoxOpen: false,
      header: null,
      isHoveringHelpBox: false,
      content: null,
      setIsHoveringHelpBox: jest.fn(),
      toggleHelpBoxOpen: jest.fn(),
      setHelpContent: jest.fn(),
      clearHelpContent: jest.fn(),
    });
  });

  it("displays account address and handles copy action", () => {
    render(<ProfileDropdown {...mockProps} />);

    const addressDisplay = screen.getByText("0x1234...cdef");
    expect(addressDisplay).toBeInTheDocument();

    fireEvent.click(addressDisplay);
    expect(mockProps.copyToClipboard).toHaveBeenCalledWith(
      mockProps.account.address,
    );
  });

  //it("displays balance information", () => {
  //  render(<ProfileDropdown {...mockProps} />);
  //
  //  expect(screen.getByText("MY BALANCE")).toBeInTheDocument();
  //  expect(screen.getByText(/1.000 ETH/)).toBeInTheDocument();
  //});

  it("handles disconnect action", () => {
    render(<ProfileDropdown {...mockProps} />);

    const disconnectButton = screen.getByText("Disconnect");
    fireEvent.click(disconnectButton);
    expect(mockProps.disconnect).toHaveBeenCalled();
  });
});

