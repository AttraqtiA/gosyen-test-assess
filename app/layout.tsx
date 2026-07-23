import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { AppTopBar } from "@/components/layout/AppTopBar";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Gosyen Assess",
  description: "Universal assessment platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const stored = window.localStorage.getItem("gosyen-theme");
                const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                const theme = stored === "light" || stored === "dark" ? stored : (systemDark ? "dark" : "light");
                document.documentElement.dataset.theme = theme;
              })();
            `,
          }}
        />
        <div className="app-shell">
          <AppTopBar />
          {children}
        </div>
      </body>
    </html>
  );
}
