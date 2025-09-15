import { render, screen, fireEvent } from "@testing-library/react";
import { Tooltip, BalanceTooltip } from "@/components/BaseComponents/Tooltip";
import { HelpProvider } from "@/context/HelpProvider";

// Mock createPortal since we're using it in BalanceTooltip
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: (node: React.ReactNode) => node,
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <HelpProvider>{children}</HelpProvider>;
};

describe("Tooltip", () => {
  it("renders tooltip content", () => {
    render(
      <TestWrapper>
        <Tooltip text="Test tooltip">
          <button>Hover me</button>
        </Tooltip>
      </TestWrapper>,
    );

    const tooltipContainer = screen
      .getByText("Hover me")
      .closest(".tooltip-container");
    expect(tooltipContainer).toBeInTheDocument();

    const tooltipContent = tooltipContainer?.querySelector(".tooltip-content");
    expect(tooltipContent).toBeInTheDocument();
    expect(tooltipContent).toHaveTextContent("Test tooltip");
    expect(tooltipContent).toHaveClass("hidden", "group-hover:block");
  });
});

describe("BalanceTooltip", () => {
  it("renders balance tooltip with correct values", () => {
    const balance = {
      locked: "100000000000000000000",
      unlocked: "50000000000000000000",
      stashed: "25000000000000000000",
    };

    render(
      <TestWrapper>
        <BalanceTooltip balance={balance}>
          <div>Balance</div>
        </BalanceTooltip>
      </TestWrapper>,
    );

    const tooltipTrigger = screen
      .getByText("Balance")
      .closest(".flex.flex-row.items-center");
    expect(tooltipTrigger).toBeInTheDocument();

    // Trigger hover
    fireEvent.mouseEnter(tooltipTrigger!);

    // Now we can check the tooltip content
    expect(screen.getByText("Balance Distribution")).toBeInTheDocument();
    expect(screen.getByText("100 ETH")).toBeInTheDocument();
    expect(screen.getByText("50 ETH")).toBeInTheDocument();
    expect(screen.getByText("25 ETH")).toBeInTheDocument();
  });

  it("handles zero balances correctly", () => {
    const balance = {
      locked: "0",
      unlocked: "0",
      stashed: "0",
    };

    render(
      <TestWrapper>
        <BalanceTooltip balance={balance}>
          <div>Balance</div>
        </BalanceTooltip>
      </TestWrapper>,
    );

    const tooltipTrigger = screen
      .getByText("Balance")
      .closest(".flex.flex-row.items-center");
    expect(tooltipTrigger).toBeInTheDocument();

    // Trigger hover
    fireEvent.mouseEnter(tooltipTrigger!);

    // Now we can check the tooltip content
    expect(screen.getByText("Balance Distribution")).toBeInTheDocument();
    expect(screen.getAllByText("0 ETH")).toHaveLength(3);
  });

  // New Test: Balances between 10 ETH and above
  it("formats large balances with one decimal place", () => {
    const balance = {
      locked: "150000000000000000000", // 150 ETH
      unlocked: "20000000000000000000", // 20 ETH
      stashed: "30000000000000000000", // 30 ETH
    };

    render(
      <TestWrapper>
        <BalanceTooltip balance={balance}>
          <div>Balance</div>
        </BalanceTooltip>
      </TestWrapper>,
    );

    const tooltipTrigger = screen
      .getByText("Balance")
      .closest(".flex.flex-row.items-center");
    expect(tooltipTrigger).toBeInTheDocument();

    // Trigger hover
    fireEvent.mouseEnter(tooltipTrigger!);

    expect(screen.getByText("150 ETH")).toBeInTheDocument();
    expect(screen.getByText("20 ETH")).toBeInTheDocument();
    expect(screen.getByText("30 ETH")).toBeInTheDocument();
  });

  // New Test: Balances between 1 ETH and less than 10 ETH
  it("formats medium balances with two decimal places", () => {
    const balance = {
      locked: "5000000000000000000", // 5 ETH
      unlocked: "2500000000000000000", // 2.5 ETH
      stashed: "7500000000000000000", // 7.5 ETH
    };

    render(
      <TestWrapper>
        <BalanceTooltip balance={balance}>
          <div>Balance</div>
        </BalanceTooltip>
      </TestWrapper>,
    );

    const tooltipTrigger = screen
      .getByText("Balance")
      .closest(".flex.flex-row.items-center");
    expect(tooltipTrigger).toBeInTheDocument();

    // Trigger hover
    fireEvent.mouseEnter(tooltipTrigger!);

    expect(screen.getByText("5 ETH")).toBeInTheDocument();
    expect(screen.getByText("2.5 ETH")).toBeInTheDocument();
    expect(screen.getByText("7.5 ETH")).toBeInTheDocument();
  });

  // New Test: Balances between 0.00001 ETH and less than 1 ETH
  it("formats small balances with five decimal places", () => {
    const balance = {
      locked: "50000000000000000", // 0.05 ETH
      unlocked: "12345000000000000", // 0.012345 ETH
      stashed: "9999900000000000", // 0.009999 ETH (should still be >= 0.00001)
    };

    render(
      <TestWrapper>
        <BalanceTooltip balance={balance}>
          <div>Balance</div>
        </BalanceTooltip>
      </TestWrapper>,
    );

    const tooltipTrigger = screen
      .getByText("Balance")
      .closest(".flex.flex-row.items-center");
    expect(tooltipTrigger).toBeInTheDocument();

    // Trigger hover
    fireEvent.mouseEnter(tooltipTrigger!);

    expect(screen.getByText("0.05 ETH")).toBeInTheDocument();
    expect(screen.getByText("0.01234 ETH")).toBeInTheDocument(); // Rounded from 0.012345
    expect(screen.getByText("0.00999 ETH")).toBeInTheDocument();
  });

  // New Test: Balances less than 0.00001 ETH
  it("displays '< 0.00001 ETH' for very small balances", () => {
    const balance = {
      locked: "9999", // 0.000009999 ETH
      unlocked: "1", // 0.000000001 ETH
      stashed: "0", // 0 ETH
    };

    render(
      <TestWrapper>
        <BalanceTooltip balance={balance}>
          <div>Balance</div>
        </BalanceTooltip>
      </TestWrapper>,
    );

    const tooltipTrigger = screen
      .getByText("Balance")
      .closest(".flex.flex-row.items-center");
    expect(tooltipTrigger).toBeInTheDocument();

    // Trigger hover
    fireEvent.mouseEnter(tooltipTrigger!);

    expect(screen.getByText("< 0.00001 ETH")).toBeInTheDocument();
    expect(screen.getByText("< 0.00001 ETH")).toBeInTheDocument();
    expect(screen.getByText("0 ETH")).toBeInTheDocument();
  });

  // New Test: Mixed balances with various formatting
  it("handles mixed balances with different formatting rules", () => {
    const balance = {
      locked: "100000000000000000000", // 100 ETH -> "100.0 ETH"
      unlocked: "5000000000000000000", // 5 ETH -> "5.00 ETH"
      stashed: "12345000000000000", // 0.012345 ETH -> "0.01235 ETH"
    };

    render(
      <TestWrapper>
        <BalanceTooltip balance={balance}>
          <div>Balance</div>
        </BalanceTooltip>
      </TestWrapper>,
    );

    const tooltipTrigger = screen
      .getByText("Balance")
      .closest(".flex.flex-row.items-center");
    expect(tooltipTrigger).toBeInTheDocument();

    // Trigger hover
    fireEvent.mouseEnter(tooltipTrigger!);

    expect(screen.getByText("100 ETH")).toBeInTheDocument();
    expect(screen.getByText("5 ETH")).toBeInTheDocument();
    expect(screen.getByText("0.01234 ETH")).toBeInTheDocument();
  });
});
