import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { CatalogReview } from "@/components/catalogs/catalog-review";

type PageProps = {
  params: Promise<{ id: string; catalogId: string }>;
};

async function CatalogContent({ params }: PageProps) {
  const { id, catalogId } = await params;

  return <CatalogReview supplierId={id} catalogId={catalogId} />;
}

export default function CatalogPage({ params }: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <CatalogContent params={params} />
    </Suspense>
  );
}