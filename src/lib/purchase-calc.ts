export function parseDecimal(value: string) {
  const text = value.trim().replace(/\s/g, "");

  if (!text) {
    return 0;
  }

  const parsed = Number(
    text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
}

export function formatPurchaseDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC"
  });
}

// Mesma regra do backend: rateio proporcional ao valor de cada item.
export function calculateFreightShares(
  items: Array<{ quantity: number; unitPrice: number }>,
  freightTotal: number
) {
  const freightCents = Math.round(freightTotal * 100);

  const subtotals = items.map((item) =>
    Math.round(item.quantity * item.unitPrice * 100)
  );

  const sum = subtotals.reduce((total, value) => total + value, 0);

  if (freightCents <= 0 || sum <= 0) {
    return items.map(() => 0);
  }

  let allocated = 0;

  return subtotals.map((subtotal, index) => {
    const isLast = index === subtotals.length - 1;

    const share = isLast
      ? freightCents - allocated
      : Math.round((freightCents * subtotal) / sum);

    allocated += share;

    return share / 100;
  });
}