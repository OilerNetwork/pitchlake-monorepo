import { render, screen, fireEvent } from "@testing-library/react";
import Tabs from "../../../../../components/Vault/VaultActions/Tabs/Tabs";
import { HelpProvider } from "@/context/HelpProvider";

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <HelpProvider>
      {children}
    </HelpProvider>
  );
};

describe("Tabs", () => {
  const defaultProps = {
    tabs: ["Tab 1", "Tab 2", "Tab 3"],
    activeTab: "Tab 1",
    setActiveTab: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders tabs with correct styling and handles interactions", () => {
    const { container } = render(
      <TestWrapper>
        <Tabs {...defaultProps} />
      </TestWrapper>
    );
    
    // Check container styling
    const tabsContainer = container.querySelector(".vault-tabs");
    expect(tabsContainer).toHaveClass(
      "flex",
      "flex-row",
      "items-center",
      "border-b",
      "border-gray-700"
    );
    
    // Check tab wrappers
    const tabWrappers = container.querySelectorAll(".vault-tab-wrapper");
    expect(tabWrappers).toHaveLength(defaultProps.tabs.length);
    tabWrappers.forEach(wrapper => {
      expect(wrapper).toHaveClass("flex", "flex-row");
    });
    
    // Check tabs styling and interactions
    const tabs = container.querySelectorAll(".vault-tab");
    expect(tabs).toHaveLength(defaultProps.tabs.length);

    tabs.forEach((tab, index) => {
      // Check base styling
      expect(tab).toHaveClass("h-[56px]", "px-6", "py-4", "relative", "text-[14px]");

      // Check active/inactive state
      if (tab.textContent === defaultProps.activeTab) {
        expect(tab).toHaveClass("text-[#F5EBB8]");
        const indicator = tab.querySelector(".vault-tab-indicator");
        expect(indicator).toHaveClass(
          "absolute",
          "bottom-0",
          "left-0",
          "w-full",
          "h-0.5",
          "bg-[#F5EBB8]"
        );
      } else {
        expect(tab).toHaveClass("text-gray-400");
        expect(tab.querySelector(".vault-tab-indicator")).toBeNull();
      }

      // Check content and order
      expect(tab).toHaveTextContent(defaultProps.tabs[index]);

      // Test click interaction
      fireEvent.click(tab);
      expect(defaultProps.setActiveTab).toHaveBeenCalledWith(defaultProps.tabs[index]);
    });
  });
}); 