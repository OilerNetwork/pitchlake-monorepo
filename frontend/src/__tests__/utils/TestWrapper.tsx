import React from "react";
import { render } from "@testing-library/react";
import { ReactNode } from "react";
import { HelpProvider, useHelpContext } from "@/context/HelpProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UiProvider } from "@/context/UiProvider";

// Mock the new context
jest.mock("@/context/NewProvider", () => ({
  useNewContext: jest.fn().mockReturnValue({
    conn: "rpc",
    wsData: {
      wsOptionBuyerStates: [],
      wsRoundStates: [{
        roundId: "1",
        startTimestamp: "1000",
        duration: "1000",
        roundState: "Open",
      }],
    },
    mockData: {
      optionBuyerStates: [],
      roundStates: [],
    },
  }),
}));

// Mock the HelpContext
jest.mock("@/context/HelpProvider", () => {
  const mockSetActiveDataId = jest.fn();
  return {
    HelpProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useHelpContext: jest.fn().mockReturnValue({
      setActiveDataId: mockSetActiveDataId,
      activeDataId: null,
      isHelpBoxOpen: false,
      header: null,
      isHoveringHelpBox: false,
      content: null,
      setIsHoveringHelpBox: jest.fn(),
      toggleHelpBoxOpen: jest.fn(),
    }),
  };
});

interface TestWrapperProps {
  children: ReactNode;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export const TestWrapper: React.FC<TestWrapperProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        {children}
      </UiProvider>
    </QueryClientProvider>
  );
};

export const renderWithProviders = (ui: ReactNode) => {
  return render(<TestWrapper>{ui}</TestWrapper>);
};

// Add tests for the wrapper itself
describe("TestWrapper", () => {
  it("provides required contexts to children", () => {
    const { container } = render(
      <TestWrapper>
        <div>Test Child</div>
      </TestWrapper>,
    );
    expect(container).toBeInTheDocument();
  });
});
