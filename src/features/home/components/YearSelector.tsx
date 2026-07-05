import type { AcademicYear } from "@/types/academic-year";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type YearSelectorProps = {
  years: AcademicYear[];
  value: number | null;
  onChange: (yearId: number) => void;
};

export function YearSelector({ years, value, onChange }: YearSelectorProps) {
  return (
    <Select value={value === null ? "" : String(value)} onValueChange={(nextValue) => onChange(Number(nextValue))}>
      <SelectTrigger className="h-10 w-full bg-white text-base sm:min-w-72">
        <SelectValue placeholder="Chọn năm học" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year.id} value={String(year.id)}>
            {year.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
