export const cleanPhoneInput = (value = "") => {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  const limited = digits.slice(0, 15);
  return `${hasPlus ? "+" : ""}${limited}`;
};

export const formatPhoneInput = (value = "") => {
  const clean = cleanPhoneInput(value);
  if (!clean) return "";

  if (clean.startsWith("+44")) {
    const digits = clean.slice(3);
    const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 11)].filter(Boolean);
    return `+44 ${parts.join(" ")}`.trim();
  }

  if (clean.startsWith("07")) {
    const digits = clean;
    const parts = [digits.slice(0, 5), digits.slice(5, 11)].filter(Boolean);
    return parts.join(" ");
  }

  if (clean.startsWith("44")) {
    const digits = clean.slice(2);
    const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 11)].filter(Boolean);
    return `+44 ${parts.join(" ")}`.trim();
  }

  return clean;
};

export const phoneValidation = (value = "") => {
  if (!value.trim()) return { valid: true, message: "" };
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
  const valid = digits.length >= 10 && digits.length <= 15;
  return {
    valid,
    message: valid ? "Looks good — WhatsApp confirmation and reminder will be sent here." : "Enter a valid mobile number, e.g. 07xxx xxxxxx or +44...",
  };
};
