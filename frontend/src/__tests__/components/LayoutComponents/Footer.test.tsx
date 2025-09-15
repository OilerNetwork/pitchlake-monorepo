import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../utils/TestWrapper";
import Footer from "@/components/LayoutComponents/Footer";

describe("Footer Component", () => {
  it("renders footer with navigation and social links", () => {
    renderWithProviders(<Footer />);

    // Check copyright section
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(`Copyright © ${currentYear} by Oiler`),
    ).toBeInTheDocument();

    // Check navigation links
    expect(
      screen.getByRole("link", { name: "Terms of Service" }),
    ).toHaveAttribute("href", "/terms");
    expect(
      screen.getByRole("link", { name: "Legal & Risk Disclosure" }),
    ).toHaveAttribute("href", "/legal");
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "href",
      "https://oilernetwork.github.io/pitchlake-docs/",
    );

    // Check social links by href
    const twitterLink = screen.getByRole("link", { name: "twitter" });
    expect(twitterLink).toHaveAttribute(
      "href",
      "https://twitter.com/OilerNetwork",
    );

    const discordLink = screen.getByRole("link", { name: "discord" });
    expect(discordLink).toHaveAttribute(
      "href",
      "https://discord.com/invite/qd5AAJPBsq",
    );

    const telegramLink = screen.getByRole("link", { name: "telegram" });
    expect(telegramLink).toHaveAttribute("href", "https://t.me/oiler_official");
  });
});
