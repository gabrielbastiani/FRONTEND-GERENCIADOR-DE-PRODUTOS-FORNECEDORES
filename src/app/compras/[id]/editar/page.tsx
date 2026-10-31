import EditPurchaseClient from "./edit-purchase-client";

export const instant = false;

type EditPurchasePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPurchasePage({
  params
}: EditPurchasePageProps) {
  const { id } = await params;

  return <EditPurchaseClient purchaseId={id} />;
}