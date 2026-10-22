"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { FileUploadField } from "@/components/file-upload-field";

interface SupplierFormData {
  id?: string;
  name?: string;
  document?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

interface SupplierFormProps {
  supplier?: SupplierFormData;
}

export function SupplierForm({ supplier }: SupplierFormProps) {
  const router = useRouter();

  const [image, setImage] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(supplier?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      setError("Informe o nome do fornecedor.");
      return;
    }

    const data = {
      name,
      document: String(formData.get("document") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      website: String(formData.get("website") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      isActive: isEditing
        ? formData.get("isActive") === "true"
        : true,
      image: image[0] ?? null
    };

    try {
      setSaving(true);
      setError("");

      if (isEditing && supplier?.id) {
        await api.updateSupplier(supplier.id, data);
      } else {
        await api.createSupplier(data);
      }

      router.push("/fornecedores");
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Nome *
          </span>

          <input
            name="name"
            required
            defaultValue={supplier?.name ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">
            CNPJ ou documento
          </span>

          <input
            name="document"
            defaultValue={supplier?.document ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Pessoa de contato
          </span>

          <input
            name="contactName"
            defaultValue={supplier?.contactName ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">
            E-mail
          </span>

          <input
            name="email"
            type="email"
            defaultValue={supplier?.email ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Telefone
          </span>

          <input
            name="phone"
            defaultValue={supplier?.phone ?? ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Website
          </span>

          <input
            name="website"
            type="url"
            defaultValue={supplier?.website ?? ""}
            placeholder="https://exemplo.com.br"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">
          Observações
        </span>

        <textarea
          name="notes"
          rows={4}
          defaultValue={supplier?.notes ?? ""}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      <FileUploadField
        label="Imagem do fornecedor"
        accept="image/jpeg,image/png,image/webp,image/gif"
        helperText="JPG, PNG, WEBP ou GIF. Tamanho máximo de 10 MB."
        files={image}
        onChange={setImage}
        currentImageUrl={supplier?.imageUrl}
      />

      {isEditing && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="isActive"
            value="true"
            defaultChecked={supplier?.isActive ?? true}
          />

          Fornecedor ativo
        </label>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Cadastrar fornecedor"}
        </button>
      </div>
    </form>
  );
}