import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMonthLabel, isValidMonthKey } from "@/lib/months";

const monthLabels = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

type MonthPickerProps = {
  id?: string;
  value: string;
  onChange: (month: string) => void;
  minMonth?: string;
  maxMonth?: string;
  disabled?: boolean;
};

export function MonthPicker({
  id,
  value,
  onChange,
  minMonth,
  maxMonth,
  disabled = false,
}: MonthPickerProps) {
  const selectedYear = isValidMonthKey(value) ? Number(value.slice(0, 4)) : new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(selectedYear);

  useEffect(() => {
    if (open) {
      setVisibleYear(selectedYear);
    }
  }, [open, selectedYear]);

  const canGoPreviousYear = useMemo(
    () => !minMonth || `${visibleYear - 1}-12` >= minMonth,
    [minMonth, visibleYear],
  );
  const canGoNextYear = useMemo(
    () => !maxMonth || `${visibleYear + 1}-01` <= maxMonth,
    [maxMonth, visibleYear],
  );

  function isMonthDisabled(month: string) {
    return Boolean((minMonth && month < minMonth) || (maxMonth && month > maxMonth));
  }

  return (
    <div className="relative">
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        className="h-10 w-full justify-between bg-white px-3 text-left font-normal"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{isValidMonthKey(value) ? `Tháng ${formatMonthLabel(value)}` : "Chọn tháng"}</span>
        <ChevronRight
          className={["size-4 text-slate-500 transition", open ? "rotate-90" : ""].join(" ")}
        />
      </Button>
      {open ? (
        <div className="absolute z-50 mt-1 w-full min-w-72 rounded-lg border bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canGoPreviousYear}
              onClick={() => setVisibleYear((year) => year - 1)}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Năm trước</span>
            </Button>
            <p className="font-semibold text-slate-950">{visibleYear}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canGoNextYear}
              onClick={() => setVisibleYear((year) => year + 1)}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Năm sau</span>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {monthLabels.map((monthNumber) => {
              const month = `${visibleYear}-${monthNumber}`;
              const selected = month === value;
              const monthDisabled = isMonthDisabled(month);

              return (
                <button
                  key={month}
                  type="button"
                  disabled={monthDisabled}
                  className={[
                    "h-9 rounded-md border text-sm transition",
                    selected
                      ? "border-slate-900 bg-slate-900 font-semibold text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    monthDisabled ? "cursor-not-allowed opacity-35 hover:bg-white" : "",
                  ].join(" ")}
                  onClick={() => {
                    onChange(month);
                    setOpen(false);
                  }}
                >
                  Tháng {monthNumber}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
