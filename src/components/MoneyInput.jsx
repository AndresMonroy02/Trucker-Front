import { useLayoutEffect, useRef } from "react";

function formatDisplay(raw) {
  if (raw === "" || raw === null || raw === undefined) return "";
  const intPart = String(raw).split(".")[0].replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (intPart === "") return "";
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseInput(displayValue) {
  return displayValue.replace(/\./g, "").replace(/\D/g, "");
}

function countDigitsBefore(text, caretPos) {
  return text.slice(0, caretPos).replace(/\D/g, "").length;
}

function caretPosForDigitCount(text, digitCount) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (/\d/.test(text[i])) {
      seen += 1;
      if (seen === digitCount) return i + 1;
    }
  }
  return text.length;
}

export default function MoneyInput({ id, name, value, onChange, required, placeholder }) {
  const inputRef = useRef(null);
  const pendingDigitCaretRef = useRef(null);

  // Re-formatting the display value on every keystroke resets the caret to the end;
  // restore it based on digit count so edits in the middle of the amount stick.
  useLayoutEffect(() => {
    if (pendingDigitCaretRef.current === null || !inputRef.current) return;
    const displayed = formatDisplay(value);
    const pos = caretPosForDigitCount(displayed, pendingDigitCaretRef.current);
    inputRef.current.setSelectionRange(pos, pos);
    pendingDigitCaretRef.current = null;
  }, [value]);

  function handleChange(event) {
    const input = event.target;
    const caretPos = input.selectionStart ?? input.value.length;
    pendingDigitCaretRef.current = countDigitsBefore(input.value, caretPos);
    const parsedValue = parseInput(input.value);
    onChange({ target: { name, value: parsedValue } });
  }

  return (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      value={formatDisplay(value)}
      onChange={handleChange}
      required={required}
      placeholder={placeholder}
    />
  );
}
