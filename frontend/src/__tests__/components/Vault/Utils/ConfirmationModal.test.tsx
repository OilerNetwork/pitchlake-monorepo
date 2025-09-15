import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmationModal from "../../../../components/Vault/Utils/ConfirmationModal";
import { useHelpContext } from "@/context/HelpProvider";

// Mock the HelpContext
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

describe("ConfirmationModal Component", () => {
  const mockOnConfirm = jest.fn().mockImplementation(() => Promise.resolve());
  const mockOnClose = jest.fn();
  const mockModalHeader = "Test Action";
  const mockAction = "Test Content";
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
    });
  });

  it("renders confirmation modal with correct content and handles interactions", () => {
    const { container } = render(
      <ConfirmationModal
        modalHeader={mockModalHeader}
        action={mockAction}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    // Check modal structure
    expect(container.querySelector(".confirmation-modal")).toBeInTheDocument();
    expect(container.querySelector(".confirmation-modal-header")).toBeInTheDocument();
    expect(container.querySelector(".confirmation-modal-content")).toBeInTheDocument();
    expect(container.querySelector(".confirmation-modal-actions")).toBeInTheDocument();

    // Check content
    expect(screen.getByText(mockModalHeader)).toBeInTheDocument();
    const message = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'p' && 
             content.includes('Are you sure you want to') &&
             content.includes('Test Content');
    });
    expect(message).toBeInTheDocument();

    // Check buttons
    const confirmButton = screen.getByText("Confirm");
    const cancelButton = screen.getByText("Cancel");
    expect(confirmButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();

    // Test button interactions
    fireEvent.click(confirmButton);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();

    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });
}); 