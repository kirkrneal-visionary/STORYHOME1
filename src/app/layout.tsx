import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Poppins } from "next/font/google";
import GlobalNav from "@/components/GlobalNav";
import Footer from "@/components/Footer";
import { AppShell } from "@/components/motion/AppShell";
import { Providers } from "@/components/Providers";
import "./globals.css";

// UI chrome — Poppins. Display headlines — Fraunces (expressive, not Inter).
// Licensed "Now" can replace Fraunces later via next/font/local.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Story Home",
    template: "%s · Story Home",
  },
  description:
    "Every home has a story. East Texas real estate marketplace and professional network — built by a realtor, for realtors. Launching across Polk, Trinity, Angelina, Tyler, San Jacinto, Liberty, and Walker counties.",
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
      <body
        className={`${poppins.variable} ${fraunces.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <Providers>
          <GlobalNav />
          <AppShell>{children}</AppShell>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
