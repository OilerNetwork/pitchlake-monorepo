import { screen } from "@testing-library/react";
import MobileScreen from "@/components/BaseComponents/MobileScreen";
import { renderWithProviders } from "@/__tests__/utils/TestWrapper";

describe("MobileScreen Component", () => {
  it("renders mobile warning screen with correct content", () => {
    renderWithProviders(<MobileScreen />);
    
    // Check text content
    expect(screen.getByText("Device Not Supported")).toBeInTheDocument();
    expect(screen.getByText("Please use a desktop or laptop to access Pitchlake.")).toBeInTheDocument();
    
    // Check warning icon presence (using text content)
    expect(screen.getByText("!")).toBeInTheDocument();
  });
}); 