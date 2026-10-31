import PurchaseDetailsClient from "./purchase-details-client";

export const instant = false;

type PurchaseDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PurchaseDetailsPage({
  params
}: PurchaseDetailsPageProps) {
  const { id } = await params;

  return <PurchaseDetailsClient purchaseId={id} />;
}
