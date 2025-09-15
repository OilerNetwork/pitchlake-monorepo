import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "../../../../components/Vault/Utils/Modal";

// Mock the ArrowLeftIcon component from lucide-react
jest.mock("lucide-react", () => ({
  ArrowLeftIcon: ({ onClick }: { onClick: () => void }) => (
    <div className="modal-close" onClick={onClick} />
  ),
}));

describe("Modal", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders modal structure with correct content", () => {
    render(
      <Modal title="Test Modal" onClose={mockOnClose}>
        <div>Test Content</div>
      </Modal>
    );

    // Check content
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("handles close actions", () => {
    const { container } = render(
      <Modal title="Test Modal" onClose={mockOnClose}>
        <div>Content</div>
      </Modal>
    );

    const closeButton = container.querySelector('.modal-close');
    expect(closeButton).not.toBeNull();
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });
}); 