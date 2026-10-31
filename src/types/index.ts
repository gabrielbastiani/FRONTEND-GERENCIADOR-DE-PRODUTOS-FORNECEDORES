export type PaginationMetadata = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMetadata;
};

export type ProductStatus =
  | "NOT_ANALYZED"
  | "IN_VALIDATION"
  | "PROMISING"
  | "WAITING"
  | "DISCARDED";

export type Marketplace =
  | "MERCADO_LIVRE"
  | "SHOPEE"
  | "OTHER";

export type Supplier = {
  id: string;
  name: string;
  document: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    catalogs?: number;
    products?: number;
  };
};

export type Catalog = {
  id: string;
  supplierId: string;
  title: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: string;
    name: string;
  };
  _count?: {
    products: number;
  };
};

export type ProductImage = {
  id: string;
  productId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  createdAt: string;
};

export type ProductStatusHistory = {
  id: string;
  productId: string;
  oldStatus: ProductStatus | null;
  newStatus: ProductStatus;
  justification: string | null;
  createdAt: string;
};

export type MarketplaceResearch = {
  id: string;
  productId: string;
  marketplace: Marketplace;
  searchedTerm: string;
  estimatedDemand: number | null;
  competition: number | null;
  salePrice: string | null;
  marketplaceFee: string | null;
  shippingCost: string | null;
  taxCost: string | null;
  otherCosts: string | null;
  estimatedProfit: string | null;
  estimatedMargin: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  supplierId: string;
  catalogId: string | null;
  name: string;
  referenceCode: string | null;
  brand: string | null;
  model: string | null;
  ean: string | null;
  cost: string | null;
  description: string | null;
  sourcePage: number | null;
  status: ProductStatus;
  justification: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Pick<Supplier, "id" | "name" | "email" | "phone">;
  catalog?: Catalog | null;
  images: ProductImage[];
  statusHistory?: ProductStatusHistory[];
  researches?: MarketplaceResearch[];
};

export type ProductListResponse = {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CommercialTransactionStatus =
  | "DRAFT"
  | "QUOTE_RECEIVED"
  | "UNDER_ANALYSIS"
  | "APPROVED"
  | "ORDER_EFFECTIVE"
  | "PARTIALLY_RECEIVED"
  | "COMPLETED"
  | "CANCELLED";

export type SupplierDocumentType =
  | "QUOTE"
  | "PURCHASE_ORDER"
  | "INVOICE"
  | "OTHER";

export type SupplierDocument = {
  id: string;
  supplierId: string;
  transactionId: string | null;
  type: SupplierDocumentType;
  title: string;
  documentNumber: string | null;
  originalName: string;
  fileName: string;
  filePath: string;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  documentDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialTransactionStatusHistory = {
  id: string;
  transactionId: string;
  oldStatus: CommercialTransactionStatus | null;
  newStatus: CommercialTransactionStatus;
  notes: string | null;
  createdAt: string;
};

export type CommercialTransaction = {
  id: string;
  supplierId: string;
  quoteReference: string | null;
  orderReference: string | null;
  quoteDate: string | null;
  orderEffectiveDate: string | null;
  status: CommercialTransactionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: string;
    name: string;
  };
  documents?: SupplierDocument[];
  items?: TransactionItem[];
  statusHistory?: CommercialTransactionStatusHistory[];
  _count?: {
    documents?: number;
    statusHistory?: number;
  };
};

export type QuoteListStatus =
  | "DRAFT"
  | "SENT"
  | "ARCHIVED";

export type QuoteListItem = {
  id: string;
  productId: string;
  productName: string;
  productCode?: string | null;
  productReference?: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    code?: string | null;
    referenceCode?: string | null;
    supplierId: string;
  };
};

export type QuoteList = {
  id: string;
  name: string;
  notes?: string | null;
  status: QuoteListStatus;
  supplierId: string;
  supplier: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    isActive: boolean;
  };
  items: QuoteListItem[];
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardSummary = {
  suppliers: {
    total: number;
    active: number;
    inactive: number;
  };

  catalogs: {
    total: number;
  };

  products: {
    total: number;
    notAnalyzed: number;
    inValidation: number;
    promising: number;
    waiting: number;
    discarded: number;
  };

  quoteLists: {
    total: number;
    drafts: number;
    sent: number;
    archived: number;
  };

  transactions: {
    total: number;
    open: number;
    approved: number;
    effectiveOrders: number;
    completed: number;
    cancelled: number;
  };

  alerts: {
    productsWithoutAnalysis: number;
    inactiveSuppliersWithProducts: number;
    draftQuoteLists: number;
  };

  recentProducts: Array<{
    id: string;
    name: string;
    referenceCode: string | null;
    supplierId: string;
    supplierName: string;
    status: string;
    createdAt: string;
  }>;

  recentQuoteLists: Array<{
    id: string;
    name: string;
    supplierId: string;
    supplierName: string;
    status: string;
    itemsCount: number;
    updatedAt: string;
  }>;

  recentTransactions: Array<{
    id: string;
    supplierId: string;
    supplierName: string;
    quoteReference: string | null;
    orderReference: string | null;
    status: string;
    updatedAt: string;
  }>;
};

export type PurchaseItem = {
  id: string;
  productId: string | null;
  name: string;
  code: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  freightShare: number;
  unitCost: number;
  totalCost: number;
  imageUrl: string | null;
};

export type Purchase = {
  id: string;
  supplierId: string;
  supplier: { id: string; name: string };
  invoiceNumber: string | null;
  invoiceKey: string | null;
  purchaseDate: string | null;
  freightTotal: number;
  notes: string | null;
  source: "MANUAL" | "XML";
  items: PurchaseItem[];
  itemsTotal: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
  transactionId: string | null;
  transaction: {
    id: string;
    quoteReference: string | null;
    orderReference: string | null;
    status: string;
  } | null;
};

export type PurchaseListResponse = PaginatedResponse<Purchase> & {
  totalSpent: number;
};

export type PurchaseInput = {
  supplierId: string;
  invoiceNumber: string | null;
  invoiceKey: string | null;
  purchaseDate: string | null;
  transactionId?: string | null;
  freightTotal: number;
  notes: string | null;
  source: "MANUAL" | "XML";
  items: Array<{
    productId: string | null;
    name: string;
    code: string | null;
    quantity: number;
    unitPrice: number;
    imageUrl?: string | null;
  }>;
};

export type PurchaseXmlPreview = {
  invoiceNumber: string;
  invoiceKey: string;
  purchaseDate: string;
  transactionId?: string | null;
  freightTotal: number;
  issuer: { name: string; document: string };
  supplierId: string | null;
  alreadyImportedPurchaseId: string | null;
  items: Array<{
    productId: string | null;
    name: string;
    code: string;
    quantity: number;
    unitPrice: number;
    imageUrl: string | null;
  }>;
};

export type PurchaseLinkOption = {
  id: string;
  quoteReference: string | null;
  orderReference: string | null;
  quoteDate: string | null;
  orderEffectiveDate: string | null;
  status: string;
  purchaseCount: number;
  xmlDocuments: Array<{ id: string; originalName: string }>;
};

export type TransactionItem = {
  id: string;
  transactionId: string;
  productId: string | null;
  name: string;
  code: string | null;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
};

export type FiscalCertificate = {
  id: string;
  cnpj: string;
  companyName: string | null;
  ufCode: number;
  environment: number;
  validFrom: string;
  validTo: string;
  autoCiencia: boolean;
  autoSync: boolean;
  lastNsu: string;
  maxNsu: string | null;
  blockedUntil: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
};

export type ReceivedInvoice = {
  id: string;
  accessKey: string;
  issuerCnpj: string;
  issuerName: string;
  number: string | null;
  series: string | null;
  issuedAt: string | null;
  totalValue: number;
  hasFullXml: boolean;
  cancelled: boolean;
  manifestStatus: "NONE" | "CIENCIA" | "CONFIRMADA" | "ERRO";
  manifestMessage: string | null;
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
};

export type ReceivedInvoiceList = {
  data: ReceivedInvoice[];
  total: number;
  page: number;
  limit: number;
};