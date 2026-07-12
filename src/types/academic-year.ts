export type AcademicYear = {
  id: number;
  label: string;
  startsAt: string;
  endsAt: string;
  isCurrent: boolean;
  classCount: number;
};

export type CreateAcademicYearInput = {
  label: string;
  startsAt: string;
  endsAt: string;
  makeCurrent?: boolean;
};

export type UpdateAcademicYearInput = {
  id: number;
  label: string;
  startsAt: string;
  endsAt: string;
};
