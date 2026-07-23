import { useRef } from "react";
import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

type DateInputProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

/**
 * Date picker có giá trị ISO yyyy-mm-dd cho API/SQLite nhưng luôn hiển thị
 * dd/mm/yyyy, không phụ thuộc locale của WebView hoặc Windows.
 */
export function DateInput({
  id,
  value,
  onValueChange,
  min,
  max,
  required,
  disabled,
  className,
  placeholder = "dd/mm/yyyy",
}: DateInputProps) {
  const nativeInputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    if (disabled) {
      return;
    }

    const input = nativeInputRef.current;
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  }

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-required={required}
        onClick={openPicker}
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-base transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm",
          className,
        )}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {formatDateKeyForDisplay(value) || placeholder}
        </span>
        <CalendarDays className="size-4 shrink-0 text-slate-600" />
      </button>
      <input
        ref={nativeInputRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </>
  );
}

export function formatDateKeyForDisplay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}
