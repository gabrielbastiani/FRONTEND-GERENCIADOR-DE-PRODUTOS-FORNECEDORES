import { Suspense } from "react";
import { Loading } from "@/components/loading";
import SupplierDetails from "./supplier-details";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function SupplierContent({
  params
}: PageProps) {
  const { id } = await params;

  return <SupplierDetails supplierId={id} />;
}

export default function SupplierPage({
  params
}: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <SupplierContent params={params} />
    </Suspense>
  );
}