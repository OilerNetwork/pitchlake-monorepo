import type { Metadata } from "next";
import React from "react";
import { Montserrat } from "next/font/google";
import "@/styles/global.css";
import { StarknetProvider } from "../context/StarknetProvider";
import { Header } from "@/components/LayoutComponents";
import TransactionProvider from "@/context/TransactionProvider";

import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import Footer from "@/components/LayoutComponents/Footer";

import { HelpProvider } from "@/context/HelpProvider";
import { UiProvider } from "@/context/UiProvider";
import { Blur } from "@/components/BaseComponents/Blur";
import NewProvider from "@/context/NewProvider";
import TimeContextProvider from "@/context/TimeProvider";
import QueryProvider from "@/components/Providers/queryProvider";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--mainFont",
});

export const metadata: Metadata = {
  title: "Pitchlake",
  description: "Gas Options Market",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${montserrat.variable}`} lang="en">
      <body className="flex flex-col min-h-[100vh] text-white">
        <QueryProvider>
        <StarknetProvider>
          <TimeContextProvider>
            <TransactionProvider>
              <NewProvider>
                <UiProvider>
                  <HelpProvider>
                    <Header />
                    <Blur>
                      <main className="flex-grow bg-faded-black-alt">
                        {children}
                      </main>
                      <div className="flex flex-col-reverse">
                        <Footer />
                      </div>
                    </Blur>
                  </HelpProvider>
                </UiProvider>
              </NewProvider>
            </TransactionProvider>
          </TimeContextProvider>
        </StarknetProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
