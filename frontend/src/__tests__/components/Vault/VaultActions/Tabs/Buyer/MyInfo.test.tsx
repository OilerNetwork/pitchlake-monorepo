import React from "react";
import { render, screen } from "@testing-library/react";
import MyInfo from "@/components/Vault/VaultActions/Tabs/Buyer/MyInfo";

describe("MyInfo Component", () => {
  it("renders correctly", () => {
    render(<MyInfo />);
    expect(screen.getByText("MyInfo")).toBeInTheDocument();
  });

  it("renders within a div", () => {
    const { container } = render(<MyInfo />);
    const divElement = container.querySelector("div");
    expect(divElement).toBeInTheDocument();
    expect(divElement?.textContent).toBe("MyInfo");
  });
}); 