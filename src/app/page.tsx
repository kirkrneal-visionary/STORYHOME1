import type { Metadata } from "next";
import { HomeSearchHero } from "@/components/home/HomeSearchHero";

export const metadata: Metadata = {
  title: "East Texas Real Estate Search",
  description:
    "Search homes for sale, rent, and sold across Polk, Trinity, Angelina, Tyler, San Jacinto, Liberty, and Walker counties. Story Home — built by a realtor, for realtors.",
};

export default function HomePage() {
  return <HomeSearchHero />;
}
