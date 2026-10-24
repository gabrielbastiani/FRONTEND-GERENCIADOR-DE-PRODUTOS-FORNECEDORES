import type { Product } from "@/types";

export type QuoteProduct = {
  id: string;
  name: string;
  code?: string | null;
  referenceCode?: string | null;
};

export type QuoteSupplier = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export const DEFAULT_REQUESTER_NAME = "Gabriel";

export function toQuoteProduct(product: Product): QuoteProduct {
  return {
    id: product.id,
    name: product.name,
    code: product.referenceCode ?? null,
    referenceCode: null
  };
}

export function buildQuoteMessage(
  requesterName: string,
  products: QuoteProduct[]
) {
  const name = requesterName.trim();

  const intro = name
    ? `Meu nome é ${name} e gostaria de saber sobre o pedido mínimo, as condições de desconto para compras em quantidade e as formas de pagamento disponíveis.`
    : "Gostaria de saber sobre o pedido mínimo, as condições de desconto para compras em quantidade e as formas de pagamento disponíveis.";

  const request =
    products.length === 1
      ? "E que gerasse um orçamento dentro da quantidade mínima com relação ao produto abaixo, por favor."
      : "E que gerasse um orçamento dentro das quantidades mínimas de cada produto com relação aos produtos abaixo, por favor.";

  const list = products
    .map((product, index) => {
      const lines = [`${index + 1}. ${product.name}`];

      if (product.code?.trim()) {
        lines.push(`   Código: ${product.code.trim()}`);
      }

      if (product.referenceCode?.trim()) {
        lines.push(`   Referência: ${product.referenceCode.trim()}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");

  return [
    "Olá, tudo bem?",
    intro,
    request,
    list,
    "Fico no aguardo. Obrigado!"
  ].join("\n\n");
}

export function buildWhatsAppUrl(phone: string, message: string) {
  let digits = phone.replace(/\D/g, "").replace(/^0+/, "");

  if (digits.length < 10) {
    return null;
  }

  // Número brasileiro sem DDI (DDD + 8 ou 9 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(
  email: string,
  subject: string,
  message: string
) {
  return `mailto:${email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(message)}`;
}