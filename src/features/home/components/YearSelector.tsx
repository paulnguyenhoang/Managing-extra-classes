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
  value: string;
  onChange: (yearId: string) => void;
};

export function YearSelector({ years, value, onChange }: YearSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-full bg-white text-base sm:min-w-72">
        <SelectValue placeholder="Chọn năm học" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year.id} value={year.id}>
            {year.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
