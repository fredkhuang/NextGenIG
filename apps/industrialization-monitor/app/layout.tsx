import type { Metadata } from "next";
import { Funnel_Display, Roboto_Flex } from "next/font/google";
import "./globals.css";

const display = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
});

const body = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Startup Industrialization Monitor | NextGen Industry Group",
  description: "Tracking startup factory and pilot sites under development in the United States.",
  icons: { icon: "/lettermark-color.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
