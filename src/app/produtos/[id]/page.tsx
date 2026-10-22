import { Suspense } from "react";
import { Loading } from "@/components/loading";
import ProductDetails from "./product-details";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function ProductContent({
  params
}: PageProps) {
  const { id } = await params;

  return <ProductDetails productId={id} />;
}

export default function ProductPage({
  params
}: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ProductContent params={params} />
    </Suspense>
  );
}