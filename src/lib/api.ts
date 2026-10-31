import type {
  Catalog,
  CommercialTransaction,
  CommercialTransactionStatus,
  Product,
  ProductListResponse,
  ProductStatus,
  QuoteList,
  QuoteListStatus,
  Supplier,
  SupplierDocument,
  DashboardSummary,
  Purchase,
  PurchaseInput,
  PurchaseXmlPreview,
  PurchaseLinkOption,
  TransactionItem,
  ReceivedInvoiceList,
  FiscalCertificate
} from "@/types";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
).replace(/\/$/, "");

export type SupplierInput = {
  name: string;
  document?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
};

type SupplierPayload = Partial<SupplierInput> & {
  isActive?: boolean;
  image?: File | null;
};

function buildSupplierFormData(data: SupplierPayload) {
  const formData = new FormData();

  const textFields = [
    "name",
    "document",
    "contactName",
    "email",
    "phone",
    "website",
    "notes"
  ] as const;

  // Campos vazios também são enviados, para permitir limpar um dado.
  for (const field of textFields) {
    const value = data[field];

    if (value !== undefined) {
      formData.append(field, value);
    }
  }

  if (data.isActive !== undefined) {
    formData.append("isActive", String(data.isActive));
  }

  if (data.image) {
    formData.append("image", data.image);
  }

  return formData;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData
        ? {}
        : {
          "Content-Type": "application/json"
        }),
      ...(options.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}.`;

    try {
      const body = await response.json();

      if (typeof body?.message === "string") {
        message = body.message;
      }
    } catch {
      // Mantém a mensagem padrão quando não houver JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiSendFormData<T = unknown>(
  path: string,
  method: "POST" | "PUT" | "PATCH",
  body: FormData
): Promise<T> {
  return request<T>(path, {
    method,
    body
  });
}

export const api = {
  async getDashboardSummary() {
    return request<DashboardSummary>("/dashboard/summary");
  },

    async listPurchases(params?: {
    supplierId?: string;
    search?: string;
    transactionId?: string;
  }) {
    const query = new URLSearchParams();

    if (params?.supplierId) {
      query.set("supplierId", params.supplierId);
    }

    if (params?.search) {
      query.set("search", params.search);
    }

    if (params?.transactionId) {
      query.set("transactionId", params.transactionId);
    }

    const queryString = query.toString();

    return request<Purchase[]>(
      `/purchases${queryString ? `?${queryString}` : ""}`
    );
  },

    async getFiscalCertificate() {
    return request<FiscalCertificate | null>("/fiscal/certificate");
  },

  async saveFiscalCertificate(input: {
    pfxBase64: string;
    password: string;
    ufCode: number;
    environment: number;
    autoCiencia: boolean;
    autoSync: boolean;
    cnpj?: string;
  }) {
    return request<FiscalCertificate>("/fiscal/certificate", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  async updateFiscalCertificate(input: {
    autoCiencia?: boolean;
    autoSync?: boolean;
  }) {
    return request<FiscalCertificate>("/fiscal/certificate", {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },

  async deleteFiscalCertificate() {
    return request<{ ok: boolean }>("/fiscal/certificate", {
      method: "DELETE"
    });
  },

  async syncFiscalNow() {
    return request<{ message: string; certificate: FiscalCertificate | null }>(
      "/fiscal/sync",
      { method: "POST" }
    );
  },

  async listReceivedInvoices(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();

    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 20));

    return request<ReceivedInvoiceList>(`/fiscal/invoices?${query.toString()}`);
  },

  async getReceivedInvoiceXml(id: string) {
    return request<{ fileName: string; xml: string }>(
      `/fiscal/invoices/${id}/xml`
    );
  },

  async manifestReceivedInvoice(id: string, kind: "CIENCIA" | "CONFIRMACAO") {
    return request<{ ok: boolean }>(`/fiscal/invoices/${id}/manifest`, {
      method: "POST",
      body: JSON.stringify({ kind })
    });
  },

  async fetchReceivedInvoiceXml(id: string) {
    return request<{ id: string; hasFullXml: boolean }>(
      `/fiscal/invoices/${id}/fetch-xml`,
      { method: "POST" }
    );
  },

  async fetchInvoiceByKey(accessKey: string) {
    return request<{ id: string; hasFullXml: boolean }>("/fiscal/fetch-by-key", {
      method: "POST",
      body: JSON.stringify({ accessKey })
    });
  },

  async listPurchaseLinkOptions(supplierId: string) {
    return request<PurchaseLinkOption[]>(
      `/purchases/link-options?supplierId=${encodeURIComponent(supplierId)}`
    );
  },

  async parsePurchaseDocumentXml(documentId: string) {
    return request<PurchaseXmlPreview>(
      `/purchases/parse-document-xml/${documentId}`,
      { method: "POST" }
    );
  },

  async uploadPurchaseImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return request<{ imageUrl: string }>("/purchases/upload-image", {
      method: "POST",
      body: formData
    });
  },

  async getPurchase(id: string) {
    return request<Purchase>(`/purchases/${id}`);
  },

  async createPurchase(data: PurchaseInput) {
    return request<Purchase>("/purchases", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updatePurchase(id: string, data: PurchaseInput) {
    return request<Purchase>(`/purchases/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deletePurchase(id: string) {
    return request<void>(`/purchases/${id}`, {
      method: "DELETE"
    });
  },

  async parsePurchaseXml(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return request<PurchaseXmlPreview>("/purchases/parse-xml", {
      method: "POST",
      body: formData
    });
  },

  async listSuppliers() {
    return request<Supplier[]>("/suppliers");
  },

  async listQuoteLists(params?: {
    status?: string;
    supplierId?: string;
  }) {
    const searchParams = new URLSearchParams();

    if (params?.status) {
      searchParams.set("status", params.status);
    }

    if (params?.supplierId) {
      searchParams.set("supplierId", params.supplierId);
    }

    const query = searchParams.toString();

    return request<QuoteList[]>(
      `/quote-lists${query ? `?${query}` : ""}`
    );
  },

  async getQuoteList(id: string) {
    return request<QuoteList>(`/quote-lists/${id}`);
  },

  async createQuoteList(data: {
    name?: string;
    notes?: string;
    supplierId: string;
    productIds?: string[];
  }) {
    return request<QuoteList>("/quote-lists", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateQuoteList(
    id: string,
    data: {
      name?: string;
      notes?: string;
      status?: QuoteListStatus;
    }
  ) {
    return request<QuoteList>(`/quote-lists/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  async deleteQuoteList(id: string) {
    return request<void>(`/quote-lists/${id}`, {
      method: "DELETE"
    });
  },

  async addItemsToQuoteList(id: string, productIds: string[]) {
    return request<QuoteList>(`/quote-lists/${id}/items`, {
      method: "POST",
      body: JSON.stringify({ productIds })
    });
  },

  async removeItemFromQuoteList(quoteListId: string, itemId: string) {
    return request<void>(
      `/quote-lists/${quoteListId}/items/${itemId}`,
      {
        method: "DELETE"
      }
    );
  },

  async getSupplier(id: string) {
    return request<Supplier>(`/suppliers/${id}`);
  },

  async listCommercialTransactions(params?: {
    supplierId?: string;
    status?: CommercialTransactionStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const query = new URLSearchParams();

    if (params?.supplierId) {
      query.set("supplierId", params.supplierId);
    }

    if (params?.status) {
      query.set("status", params.status);
    }

    if (params?.search) {
      query.set("search", params.search);
    }

    if (params?.startDate) {
      query.set("startDate", params.startDate);
    }

    if (params?.endDate) {
      query.set("endDate", params.endDate);
    }

    const queryString = query.toString();

    return request<CommercialTransaction[]>(
      `/transactions${queryString ? `?${queryString}` : ""}`
    );
  },

  async getCommercialTransaction(id: string) {
    return request<CommercialTransaction>(
      `/transactions/${id}`
    );
  },

  async createCommercialTransaction(data: {
    supplierId: string;
    quoteReference?: string;
    orderReference?: string;
    quoteDate?: string;
    orderEffectiveDate?: string;
    status?: CommercialTransactionStatus;
    notes?: string;
  }) {
    return request<CommercialTransaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateCommercialTransaction(
    id: string,
    data: {
      quoteReference?: string;
      orderReference?: string;
      quoteDate?: string;
      orderEffectiveDate?: string;
      status?: CommercialTransactionStatus;
      notes?: string;
    }
  ) {
    return request<CommercialTransaction>(
      `/transactions/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data)
      }
    );
  },

  async updateCommercialTransactionStatus(
    id: string,
    data: {
      status: CommercialTransactionStatus;
      orderReference?: string;
      orderEffectiveDate?: string;
      notes?: string;
    }
  ) {
    return request<CommercialTransaction>(
      `/transactions/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify(data)
      }
    );
  },

  async deleteCommercialTransaction(id: string) {
    return request<void>(`/transactions/${id}`, {
      method: "DELETE"
    });
  },

  async listTransactionDocuments(transactionId: string) {
    return request<SupplierDocument[]>(
      `/transactions/${transactionId}/documents`
    );
  },

  async uploadTransactionDocument(data: {
    transactionId: string;
    type: "QUOTE" | "PURCHASE_ORDER" | "INVOICE" | "OTHER";
    title: string;
    documentNumber?: string;
    documentDate?: string;
    notes?: string;
    file: File;
  }) {
    const formData = new FormData();

    formData.append("type", data.type);
    formData.append("title", data.title);
    formData.append(
      "documentNumber",
      data.documentNumber ?? ""
    );
    formData.append(
      "documentDate",
      data.documentDate ?? ""
    );
    formData.append("notes", data.notes ?? "");
    formData.append("file", data.file);

    return request<SupplierDocument>(
      `/transactions/${data.transactionId}/documents`,
      {
        method: "POST",
        body: formData
      }
    );
  },

  async deleteTransactionDocument(
    transactionId: string,
    documentId: string
  ) {
    return request<void>(
      `/transactions/${transactionId}/documents/${documentId}`,
      {
        method: "DELETE"
      }
    );
  },

    async replaceTransactionItems(
    transactionId: string,
    items: Array<{
      productId: string | null;
      name: string;
      code: string | null;
      quantity: number;
      unitPrice: number;
    }>
  ) {
    return request<TransactionItem[]>(
      `/transactions/${transactionId}/items`,
      {
        method: "PUT",
        body: JSON.stringify({ items })
      }
    );
  },

  async deleteProductsBulk(ids: string[]) {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

    const response = await fetch(`${baseUrl}/products/bulk`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ids })
    });

    if (!response.ok) {
      let message = "Não foi possível excluir os produtos.";

      try {
        const data = await response.json();

        if (data?.message) {
          message = data.message;
        }
      } catch {
        // resposta sem corpo JSON
      }

      throw new Error(message);
    }
  },

  async createSupplier(data: {
    name: string;
    document?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
    notes?: string;
    image?: File | null;
  }) {
    const formData = new FormData();

    formData.append("name", data.name);
    formData.append("document", data.document ?? "");
    formData.append("contactName", data.contactName ?? "");
    formData.append("email", data.email ?? "");
    formData.append("phone", data.phone ?? "");
    formData.append("website", data.website ?? "");
    formData.append("notes", data.notes ?? "");
    formData.append("isActive", "true");

    if (data.image) {
      formData.append("image", data.image);
    }

    return request<Supplier>("/suppliers", {
      method: "POST",
      body: formData
    });
  },

  async updateSupplier(
    id: string,
    data: Partial<{
      name: string;
      document: string;
      contactName: string;
      email: string;
      phone: string;
      website: string;
      notes: string;
      isActive: boolean;
      image: File | null;
    }>
  ) {
    const formData = new FormData();

    formData.append("name", data.name ?? "");
    formData.append("document", data.document ?? "");
    formData.append("contactName", data.contactName ?? "");
    formData.append("email", data.email ?? "");
    formData.append("phone", data.phone ?? "");
    formData.append("website", data.website ?? "");
    formData.append("notes", data.notes ?? "");
    formData.append("isActive", String(data.isActive ?? true));

    if (data.image) {
      formData.append("image", data.image);
    }

    return request<Supplier>(`/suppliers/${id}`, {
      method: "PUT",
      body: formData
    });
  },

  async deleteSupplier(id: string) {
    return request<void>(`/suppliers/${id}`, {
      method: "DELETE"
    });
  },

  async listCatalogs(supplierId?: string) {
    const query = supplierId
      ? `?supplierId=${encodeURIComponent(supplierId)}`
      : "";

    return request<Catalog[]>(`/catalogs${query}`);
  },

  async getCatalog(id: string) {
    return request<Catalog>(`/catalogs/${id}`);
  },

  async createCatalog(data: {
    supplierId: string;
    title: string;
    notes?: string;
    file: File;
  }) {
    const formData = new FormData();

    formData.append("supplierId", data.supplierId);
    formData.append("title", data.title);

    if (data.notes) {
      formData.append("notes", data.notes);
    }

    formData.append("file", data.file);

    return request<Catalog>("/catalogs", {
      method: "POST",
      body: formData
    });
  },

  async updateCatalog(
    id: string,
    data: {
      title?: string;
      notes?: string;
    }
  ) {
    return request<Catalog>(`/catalogs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteCatalog(id: string) {
    return request<void>(`/catalogs/${id}`, {
      method: "DELETE"
    });
  },

  async listProducts(params?: {
    supplierId?: string;
    catalogId?: string;
    status?: ProductStatus;
    search?: string;
    sourcePageOrder?: "asc" | "desc";
    activeSuppliersOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();

    if (params?.supplierId) {
      query.set("supplierId", params.supplierId);
    }

    if (params?.catalogId) {
      query.set("catalogId", params.catalogId);
    }

    if (params?.status) {
      query.set("status", params.status);
    }

    if (params?.search) {
      query.set("search", params.search);
    }

    if (params?.sourcePageOrder) {
      query.set("sourcePageOrder", params.sourcePageOrder);
    }

    if (params?.activeSuppliersOnly) {
      query.set("activeSuppliersOnly", "true");
    }

    if (params?.page) {
      query.set("page", String(params.page));
    }

    if (params?.limit) {
      query.set("limit", String(params.limit));
    }

    const queryString = query.toString();

    return request<ProductListResponse>(
      `/products${queryString ? `?${queryString}` : ""}`
    );
  },

  async getProduct(id: string) {
    return request<Product>(`/products/${id}`);
  },

  async createProduct(data: {
    supplierId: string;
    catalogId?: string;
    name: string;
    referenceCode?: string;
    brand?: string;
    model?: string;
    ean?: string;
    cost?: string;
    description?: string;
    sourcePage?: string;
    status?: ProductStatus;
    justification?: string;
    images?: File[];
  }) {
    const formData = new FormData();

    formData.append("supplierId", data.supplierId);
    formData.append("name", data.name);

    const fields = [
      "catalogId",
      "referenceCode",
      "brand",
      "model",
      "ean",
      "cost",
      "description",
      "sourcePage",
      "status",
      "justification"
    ] as const;

    for (const field of fields) {
      const value = data[field];

      if (value !== undefined && value !== "") {
        formData.append(field, value);
      }
    }

    for (const image of data.images ?? []) {
      formData.append("images", image);
    }

    return request<Product>("/products", {
      method: "POST",
      body: formData
    });
  },

  async updateProduct(
    id: string,
    data: Partial<{
      catalogId: string;
      name: string;
      referenceCode: string;
      brand: string;
      model: string;
      ean: string;
      cost: string;
      description: string;
      sourcePage: string;
      status: ProductStatus;
      justification: string;
    }> & {
      images?: File[];
    }
  ) {
    const formData = new FormData();

    for (const [key, value] of Object.entries(data)) {
      if (key === "images") {
        continue;
      }

      if (value !== undefined && value !== "") {
        formData.append(key, String(value));
      }
    }

    for (const image of data.images ?? []) {
      formData.append("images", image);
    }

    return request<Product>(`/products/${id}`, {
      method: "PUT",
      body: formData
    });
  },

  async updateProductStatus(
    id: string,
    data: {
      status: ProductStatus;
      justification?: string;
    }
  ) {
    return request<Product>(`/products/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  async deleteProduct(id: string) {
    return request<void>(`/products/${id}`, {
      method: "DELETE"
    });
  },

  async deleteProductImage(productId: string, imageId: string) {
    return request<void>(
      `/products/${productId}/images/${imageId}`,
      {
        method: "DELETE"
      }
    );
  }
};