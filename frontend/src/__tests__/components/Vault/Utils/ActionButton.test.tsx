import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionButton from "@/components/Vault/Utils/ActionButton";
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

describe("ActionButton", () => {
  const mockOnClick = jest.fn();
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

  it("renders button with correct states and handles interactions", () => {
    // Test enabled state
    const { rerender } = render(
      <ActionButton
        onClick={mockOnClick}
        disabled={false}
        text="Click Me"
        dataId="test-button"
      />
    );

    const button = screen.getByRole("button", { name: "Click Me" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    // Test click handler
    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);

    // Test disabled state
    rerender(
      <ActionButton
        onClick={mockOnClick}
        disabled={true}
        text="Click Me"
        dataId="test-button"
      />
    );

    expect(button).toBeDisabled();
  });

  it("sets active data ID when hoverable is clicked", () => {
    render(
      <ActionButton
        onClick={mockOnClick}
        disabled={false}
        text="Click Me"
        dataId="test-button"
      />
    );

    const hoverable = screen.getByText("Click Me").closest("[data-item='test-button']");
    expect(hoverable).toBeInTheDocument();
    
    fireEvent.click(hoverable!);
    expect(mockSetActiveDataId).toHaveBeenCalledWith("test-button");
  });
}); 