import React from "react";
import { render, screen } from "@testing-library/react";
import MyInfo from "@/components/Vault/VaultActions/Tabs/Provider/MyInfo";

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  Clock: () => <span data-testid="clock-icon">⏰</span>,
  ArrowUp: () => <span data-testid="arrow-up-icon">↑</span>,
  ArrowDown: () => <span data-testid="arrow-down-icon">↓</span>,
}));

describe("MyInfo Component", () => {
  it("renders provider info with correct styling and content", () => {
    const { container } = render(<MyInfo />);
    
    // Check main container structure
    const mainContainer = container.querySelector(".vault-provider-info");
    expect(mainContainer).toHaveClass("text-white", "rounded-lg");
    
    const contentContainer = container.querySelector(".vault-provider-info-content");
    expect(contentContainer).toHaveClass("space-y-4", "p-6");

    // Check info items
    const items = container.querySelectorAll(".vault-info-item");
    expect(items).toHaveLength(5); // P&L, Starting Balance, Ending Balance, Premiums, Payouts

    items.forEach(item => {
      // Check item structure and styling
      const label = item.querySelector(".vault-info-label");
      const value = item.querySelector(".vault-info-value");
      
      expect(label).toHaveClass("text-regular", "text-[var(--buttongrey)]", "text-[14px]");
      expect(value).toHaveClass("flex", "flex-row", "items-center", "text-medium", "text-[14px]");

      // Check specific items
      if (label?.textContent === "P&L") {
        const percentage = item.querySelector(".vault-info-percentage");
        expect(percentage).toHaveClass("bg-[#214C0B80]", "text-[#6AB942]");
        expect(percentage?.querySelector("[data-testid='arrow-up-icon']")).toBeInTheDocument();
      }

      if (label?.textContent === "Payouts Lost") {
        expect(item.querySelector("[data-testid='clock-icon']")).toBeInTheDocument();
      } else {
        expect(item.querySelector("[data-testid='clock-icon']")).not.toBeInTheDocument();
      }
    });
  });
}); 