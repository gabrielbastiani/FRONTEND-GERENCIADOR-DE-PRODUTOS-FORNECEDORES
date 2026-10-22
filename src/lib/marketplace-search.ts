export type MarketplaceValue =
  | "MERCADO_LIVRE"
  | "SHOPEE"
  | "AMAZON"
  | "MAGALU"
  | "SHEIN"
  | "OTHER";

export const MARKETPLACE_LABELS: Record<MarketplaceValue, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  SHOPEE: "Shopee",
  AMAZON: "Amazon",
  MAGALU: "Magalu",
  SHEIN: "Shein",
  OTHER: "Outro"
};

export interface SearchChannel {
  value: Exclude<MarketplaceValue, "OTHER">;
  label: string;
  buildUrl: (term: string) => string;
}

export const SEARCH_CHANNELS: SearchChannel[] = [
  {
    value: "MERCADO_LIVRE",
    label: "Mercado Livre",
    buildUrl: (term) =>
      `https://lista.mercadolivre.com.br/${encodeURIComponent(
        term.trim().replace(/\s+/g, "-")
      )}`
  },
  {
    value: "SHOPEE",
    label: "Shopee",
    buildUrl: (term) =>
      `https://shopee.com.br/search?keyword=${encodeURIComponent(
        term.trim()
      )}`
  },
  {
    value: "AMAZON",
    label: "Amazon",
    buildUrl: (term) =>
      `https://www.amazon.com.br/s?k=${encodeURIComponent(
        term.trim()
      )}`
  },
  {
    value: "MAGALU",
    label: "Magalu",
    buildUrl: (term) =>
      `https://www.magazineluiza.com.br/busca/${encodeURIComponent(
        term.trim()
      )}/`
  },
  {
    value: "SHEIN",
    label: "Shein",
    buildUrl: (term) =>
      `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
        term.trim()
      )}`
  }
];

export interface ResearchProduct {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  ean?: string | null;
  referenceCode?: string | null;
  cost?: string | number | null;
}

export interface SearchTerm {
  label: string;
  value: string;
}

export function buildSearchTerms(product: ResearchProduct): SearchTerm[] {
  const terms: SearchTerm[] = [];

  const ean = product.ean?.replace(/\D/g, "");
  if (ean) {
    terms.push({ label: "EAN", value: ean });
  }

  const brandModel = [product.brand, product.model]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(" ");

  if (brandModel) {
    terms.push({ label: "Marca + modelo", value: brandModel });
  }

  const reference = product.referenceCode?.trim();
  if (reference) {
    terms.push({ label: "Código de referência", value: reference });
  }

  if (product.name?.trim()) {
    terms.push({ label: "Nome do produto", value: product.name.trim() });
  }

  const seen = new Set<string>();

  return terms.filter((term) => {
    const key = term.value.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}