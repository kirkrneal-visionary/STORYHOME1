import type { Metadata } from "next";
import { HomeSearchHero } from "@/components/home/HomeSearchHero";

export const metadata: Metadata = {
  title: "Houston Real Estate Search",
  description:
    "Search homes for sale, rent, and sold in Houston, Texas. Story Home — every home has a story.",
};

export default function HomePage() {
  return <HomeSearchHero />;
}
