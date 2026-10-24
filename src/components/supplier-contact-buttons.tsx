import { Mail, MessageCircle } from "lucide-react";

type SupplierContactButtonsProps = {
  supplierName?: string | null;
  phone?: string | null;
  email?: string | null;
  productName?: string | null;
  productReference?: string | null;
  variant?: "icon" | "full";
  className?: string;
};

function buildMessage(
  supplierName?: string | null,
  productName?: string | null,
  productReference?: string | null
) {
  if (productName) {
    const reference = productReference
      ? ` (ref. ${productReference})`
      : "";

    return `Olá! Tenho interesse no produto "${productName}"${reference}. Poderia me passar mais informações?`;
  }

  return supplierName
    ? `Olá, ${supplierName}! Gostaria de falar com você.`
    : "Olá! Gostaria de falar com você.";
}

function buildWhatsAppLink(raw: string, message: string) {
  let digits = raw.replace(/\D/g, "").replace(/^0+/, "");

  if (!digits) {
    return null;
  }

  // Números brasileiros sem DDI (DDD + 8 ou 9 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function buildEmailLink(
  email: string,
  subject: string,
  message: string
) {
  return `mailto:${email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(message)}`;
}

export function SupplierContactButtons({
  supplierName,
  phone,
  email,
  productName,
  productReference,
  variant = "icon",
  className = ""
}: SupplierContactButtonsProps) {
  const message = buildMessage(
    supplierName,
    productName,
    productReference
  );

  const subject = productName
    ? `Interesse no produto: ${productName}`
    : `Contato${supplierName ? ` - ${supplierName}` : ""}`;

  const whatsappLink = phone?.trim()
    ? buildWhatsAppLink(phone, message)
    : null;

  const trimmedEmail = email?.trim() ?? "";
  const emailLink = trimmedEmail.includes("@")
    ? buildEmailLink(trimmedEmail, subject, message)
    : null;

  if (!whatsappLink && !emailLink) {
    return variant === "icon" ? (
      <span className="text-slate-400">-</span>
    ) : (
      <p className={`text-sm text-slate-500 ${className}`}>
        Nenhum phone ou e-mail cadastrado para este fornecedor.
      </p>
    );
  }

  if (variant === "icon") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            title="Chamar no phone"
            aria-label={`Chamar ${supplierName ?? "fornecedor"} no phone`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
          >
            <MessageCircle size={16} />
          </a>
        )}

        {emailLink && (
          <a
            href={emailLink}
            title="Enviar e-mail"
            aria-label={`Enviar e-mail para ${supplierName ?? "fornecedor"}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            <Mail size={16} />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <MessageCircle size={16} />
          phone
        </a>
      )}

      {emailLink && (
        <a
          href={emailLink}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Mail size={16} />
          Enviar e-mail
        </a>
      )}
    </div>
  );
}