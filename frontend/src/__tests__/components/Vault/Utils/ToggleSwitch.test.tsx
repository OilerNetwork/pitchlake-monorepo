import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ToggleSwitch from "@/components/Vault/Utils/ToggleSwitch";

describe("ToggleSwitch", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with unchecked state", () => {
    render(
      <ToggleSwitch
        isChecked={false}
        onChange={mockOnChange}
        label="Test Label"
      />
    );

    expect(screen.getByText("Test Label")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    const bgElement = checkbox.parentElement?.querySelector("div");
    expect(bgElement).toHaveClass("bg-[#373632]");
  });

  it("renders with checked state", () => {
    render(
      <ToggleSwitch
        isChecked={true}
        onChange={mockOnChange}
        label="Test Label"
      />
    );

    expect(screen.getByText("Test Label")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    const bgElement = checkbox.parentElement?.querySelector("div");
    expect(bgElement).toHaveClass("bg-[#524F44]");
  });

  it("calls onChange when clicked", () => {
    render(
      <ToggleSwitch
        isChecked={false}
        onChange={mockOnChange}
        label="Test Label"
      />
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it("shows input field and balance when checked", () => {
    render(
      <ToggleSwitch
        isChecked={true}
        onChange={mockOnChange}
        label="Test Label"
      />
    );

    expect(screen.getByPlaceholderText("Enter Address")).toBeInTheDocument();
    expect(screen.getByText("BNF's Unlocked Balance")).toBeInTheDocument();
    expect(screen.getByText("12.8 ETH")).toBeInTheDocument();
  });

  it("hides input field and balance when unchecked", () => {
    render(
      <ToggleSwitch
        isChecked={false}
        onChange={mockOnChange}
        label="Test Label"
      />
    );

    expect(screen.queryByPlaceholderText("Enter Address")).not.toBeInTheDocument();
    expect(screen.queryByText("BNF's Unlocked Balance")).not.toBeInTheDocument();
    expect(screen.queryByText("12.8 ETH")).not.toBeInTheDocument();
  });

  it("updates input field value when typing", () => {
    render(
      <ToggleSwitch
        isChecked={true}
        onChange={mockOnChange}
        label="Test Label"
      />
    );

    const input = screen.getByPlaceholderText("Enter Address");
    fireEvent.change(input, { target: { value: "0x123" } });
    expect(input).toHaveValue("0x123");
  });
}); 