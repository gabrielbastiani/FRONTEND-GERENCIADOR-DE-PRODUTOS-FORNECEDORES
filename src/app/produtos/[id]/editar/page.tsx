import { Suspense } from "react";
import { Loading } from "@/components/loading";
import ProductEditForm from "./product-edit-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function EditContent({ params }: PageProps) {
  const { id } = await params;

  return <ProductEditForm productId={id} />;
}

export default function EditProductPage({ params }: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <EditContent params={params} />
    </Suspense>
  );
}