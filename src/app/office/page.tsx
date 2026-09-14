import type { Metadata } from "next";
import { OfficeHome } from "@/components/office/OfficeHome";

export const metadata: Metadata = {
  title: "Office · Story Home",
};

export default function OfficePage() {
  return <OfficeHome />;
}
