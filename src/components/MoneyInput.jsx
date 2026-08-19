function formatDisplay(raw) {
  if (raw === "" || raw === null || raw === undefined) return "";
  const [intPart, decPart] = String(raw).split(".");
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? `${groupedInt},${decPart}` : groupedInt;
}

function parseInput(displayValue) {
  let cleaned = displayValue.replace(/\./g, "").replace(",", ".");
  cleaned = cleaned.replace(/[^\d.]/g, "");

  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
  }

  return cleaned;
}

export default function MoneyInput({ id, name, value, onChange, required, placeholder }) {
  function handleChange(event) {
    const parsedValue = parseInput(event.target.value);
    onChange({ target: { name, value: parsedValue } });
  }

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      value={formatDisplay(value)}
      onChange={handleChange}
      required={required}
      placeholder={placeholder}
    />
  );
}
