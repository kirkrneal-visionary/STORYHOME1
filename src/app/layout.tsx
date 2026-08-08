import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import GlobalNav from "@/components/GlobalNav";
import { Providers } from "@/components/Providers";
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
        className={`${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <Providers>
          <GlobalNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
