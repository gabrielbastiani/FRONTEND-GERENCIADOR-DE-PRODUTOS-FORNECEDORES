import { Suspense } from "react";
import { Loading } from "@/components/loading";
import ProductForm from "./product-form";

export default function NewProductPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductForm />
    </Suspense>
  );
}