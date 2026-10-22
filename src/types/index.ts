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
  supplier?: Supplier;
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
  statusHistory?: CommercialTransactionStatusHistory[];
  _count?: {
    documents?: number;
    statusHistory?: number;
  };
};