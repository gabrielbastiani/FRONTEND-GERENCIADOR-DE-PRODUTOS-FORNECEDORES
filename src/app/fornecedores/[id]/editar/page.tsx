import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { SupplierForm } from "@/components/suppliers/supplier-form";

type EditSupplierPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSupplierPage({
  params
}: EditSupplierPageProps) {
  const { id } = await params;

  try {
    const supplier = await api.getSupplier(id);

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Editar fornecedor
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Atualize os dados e a imagem do fornecedor.
          </p>
        </div>

        <SupplierForm supplier={supplier} />
      </div>
    );
  } catch {
    notFound();
  }
}