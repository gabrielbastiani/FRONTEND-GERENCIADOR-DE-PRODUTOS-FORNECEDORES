import { SupplierForm } from "@/components/suppliers/supplier-form";

export default function NewSupplierPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Novo fornecedor
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Cadastre os dados e a imagem do fornecedor.
        </p>
      </div>

      <SupplierForm />
    </div>
  );
}