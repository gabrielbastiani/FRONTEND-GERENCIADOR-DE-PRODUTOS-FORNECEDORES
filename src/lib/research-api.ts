import type { MarketplaceValue } from "@/lib/marketplace-search";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export interface MarketplaceResearch {
  id: string;
  productId: string;
  marketplace: MarketplaceValue;
  searchedTerm: string;
  estimatedDemand: number | null;
  competition: number | null;
  salePrice: string | number | null;
  marketplaceFee: string | number | null;
  shippingCost: string | number | null;
  taxCost: string | number | null;
  otherCosts: string | number | null;
  estimatedProfit: string | number | null;
  estimatedMargin: string | number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchPayload {
  marketplace: MarketplaceValue;
  searchedTerm: string;
  estimatedDemand: number | null;
  competition: number | null;
  salePrice: number | null;
  marketplaceFee: number | null;
  shippingCost: number | null;
  taxCost: number | null;
  otherCosts: number | null;
  notes: string | null;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    // A lista é recarregada depois de criar/editar/excluir uma pesquisa.
    // Evita que o navegador ou uma camada intermediária reapresente um GET antigo.
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    let message = "Não foi possível concluir a operação.";

    try {
      const data = await response.json();
      if (data?.message) {
        message = data.message;
      }
    } catch {
      // resposta sem JSON
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listResearch(productId: string) {
  return call<MarketplaceResearch[]>(
    `/marketplace-research?productId=${encodeURIComponent(productId)}`
  );
}

export function createResearch(
  productId: string,
  payload: ResearchPayload
) {
  return call<MarketplaceResearch>("/marketplace-research", {
    method: "POST",
    body: JSON.stringify({ productId, ...payload })
  });
}

export function updateResearch(id: string, payload: ResearchPayload) {
  return call<MarketplaceResearch>(`/marketplace-research/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteResearch(id: string) {
  return call<void>(`/marketplace-research/${id}`, {
    method: "DELETE"
  });
}