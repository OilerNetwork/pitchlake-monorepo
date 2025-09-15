import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import InputField from "@/components/Vault/Utils/InputField";
import { useAccount } from "@starknet-react/core";
import { useUiContext } from "@/context/UiProvider";
import { useHelpContext } from "@/context/HelpProvider";

// Mock the hooks
jest.mock("@starknet-react/core", () => ({
  useAccount: jest.fn(),
}));

jest.mock("@/context/UiProvider", () => ({
  useUiContext: jest.fn(),
}));

jest.mock("@/context/HelpProvider", () => ({
  useHelpContext: jest.fn(),
}));

describe("InputField Components", () => {
  const mockOnChange = jest.fn();
  const mockOpenWalletLogin = jest.fn();
  const mockSetActiveDataId = jest.fn();

  const defaultProps = {
    label: "Test Label",
    value: "Test Value",
    dataId: "test-id",
    onChange: mockOnChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      account: { address: "0x123" },
    });
    (useUiContext as jest.Mock).mockReturnValue({
      openWalletLogin: mockOpenWalletLogin,
    });
    (useHelpContext as jest.Mock).mockReturnValue({
      setActiveDataId: mockSetActiveDataId,
      activeDataId: null,
      isHelpBoxOpen: false,
      header: null,
      isHoveringHelpBox: false,
    });
  });

  describe("InputField", () => {
    const getInput = (container: HTMLElement) =>
      container.querySelector(".input-field") as HTMLInputElement;

    it("renders basic input field correctly", () => {
      const { container } = render(<InputField {...defaultProps} />);
      const input = getInput(container);
      expect(input).toBeInTheDocument();
      expect(input.value).toBe("Test Value");
    });

    it("handles input changes", () => {
      const { container } = render(<InputField {...defaultProps} />);
      const input = getInput(container);
      fireEvent.change(input, { target: { value: "New Value" } });
      expect(mockOnChange).toHaveBeenCalled();
    });

    it("displays error message when provided", () => {
      const { container } = render(
        <InputField {...defaultProps} error="Error Message" />,
      );
      const errorMessage = container.querySelector(".error-message");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage?.textContent).toBe("Error Message");

      const input = getInput(container);
      expect(input).toBeInTheDocument();
    });

    it("shows secondary label when provided", () => {
      render(<InputField {...defaultProps} label2="Secondary Label" />);
      expect(screen.getByText("Secondary Label")).toBeInTheDocument();
    });

    it("handles disabled state", () => {
      const { container } = render(<InputField {...defaultProps} disabled />);
      const input = getInput(container);
      expect(input.disabled).toBe(true);
    });

    it("opens wallet login when clicked without connected account", () => {
      (useAccount as jest.Mock).mockReturnValue({ account: null });
      const { container } = render(<InputField {...defaultProps} />);
      const input = getInput(container);
      fireEvent.click(input);
      expect(mockOpenWalletLogin).toHaveBeenCalled();
    });

    it("accepts different input types", () => {
      const { container } = render(
        <InputField {...defaultProps} type="number" />,
      );
      const input = getInput(container);
      expect(input.type).toBe("number");
    });

    it("displays placeholder text", () => {
      const { container } = render(
        <InputField {...defaultProps} placeholder="Enter value" />,
      );
      const input = getInput(container);
      expect(input.placeholder).toBe("Enter value");
    });

    it("sets active data ID when hoverable is clicked", () => {
      const { container } = render(<InputField {...defaultProps} />);
      const hoverable = container.querySelector("[data-item='test-id']");
      expect(hoverable).toBeInTheDocument();
      fireEvent.click(hoverable!);
      expect(mockSetActiveDataId).toHaveBeenCalledWith("test-id");
    });
  });
});
