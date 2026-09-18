"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  caretFromNumericCount,
  countNumericPrefix,
  exactInputMode,
  formatExactDisplay,
  interpretExactTyping,
  type ExactKind,
} from "@/lib/search/exact-input";

export function ExactBoundInput({
  kind,
  value,
  placeholder,
  accessibleLabel,
  onChange,
}: {
  kind: ExactKind;
  value: string;
  placeholder: string;
  accessibleLabel: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatExactDisplay(value, kind));
  const allowDecimal = kind === "acres";

  useEffect(() => {
    if (!focused) setText(formatExactDisplay(value, kind));
  }, [value, kind, focused]);

  useLayoutEffect(() => {
    const el = ref.current;
    const pos = caretRef.current;
    if (!el || pos == null) return;
    el.setSelectionRange(pos, pos);
    caretRef.current = null;
  });

  return (
    <input
      ref={ref}
      type="text"
      inputMode={exactInputMode(kind)}
      value={text}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(formatExactDisplay(value, kind));
      }}
      onChange={(e) => {
        const el = e.target;
        const raw = el.value;
        const count = countNumericPrefix(
          raw,
          el.selectionStart ?? raw.length,
          allowDecimal,
        );
        const next = interpretExactTyping(raw, kind);
        caretRef.current = caretFromNumericCount(
          next.display,
          count,
          allowDecimal,
        );
        setText(next.display);
        if (next.canonical !== value) onChange(next.canonical);
      }}
      aria-label={`${accessibleLabel} exact amount`}
      autoComplete="off"
      enterKeyHint="done"
      data-exact-kind={kind}
      className="story-home-filter-input"
    />
  );
}
