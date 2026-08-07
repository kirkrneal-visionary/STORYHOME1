import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Story Home",
    template: "%s · Story Home",
  },
  description:
    "Premium two-sided real estate marketplace and professional network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-role="consumer" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem("story-home-role");if(r==="professional"||r==="consumer"){document.documentElement.dataset.role=r;}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${fraunces.variable} ${inter.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
