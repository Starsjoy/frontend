/** @jsxImportSource ../pages/Admin/adminJsx */
import React, { useEffect, useRef, useState } from "react";

/**
 * Rasmdagi uslub: qorong‘u fon, ko‘k border, emoji + label, ochiladigan ro‘yxat.
 */
export default function AdminCustomSelect({
  value,
  onChange,
  options,
  disabled = false,
  className = "",
  ariaLabel = "Tanlash",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  const pick = (next) => {
    if (disabled) return;
    onChange(next);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`admin-custom-select ${open ? "is-open" : ""} ${className}`.trim()}
    >
      <button
        type="button"
        className="admin-custom-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="admin-custom-select-trigger-text">
          {selected?.icon ? <span className="admin-custom-select-icon">{selected.icon}</span> : null}
          <span>{selected?.label ?? "—"}</span>
        </span>
        <span className="admin-custom-select-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <ul className="admin-custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((opt) => (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === opt.value}
                className={`admin-custom-select-option ${
                  value === opt.value ? "is-active" : ""
                }`}
                onClick={() => pick(opt.value)}
              >
                {opt.icon ? (
                  <span className="admin-custom-select-option-icon">{opt.icon}</span>
                ) : null}
                <span>{opt.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
