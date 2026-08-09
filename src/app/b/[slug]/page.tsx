import { BrokeragePublicView } from "@/components/brokerage/BrokeragePublicView";

export default async function BrokeragePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BrokeragePublicView slug={slug} />;
}
