type StudentRosterSortOptions<T> = {
  getFullName?: (item: T) => string | null | undefined;
  getMembershipId?: (item: T) => string | number | null | undefined;
  getStudentId?: (item: T) => string | number | null | undefined;
};

const vietnameseNameCollator = new Intl.Collator("vi-VN", {
  numeric: true,
  sensitivity: "base",
  usage: "sort",
});

export function sortStudentsByVietnameseName<T>(
  students: readonly T[],
  options: StudentRosterSortOptions<T> = {},
) {
  const decoratedStudents = students.map((student, index) => ({
    student,
    index,
    fullName: normalizeStudentName(getFullName(student, options)),
    membershipId: getMembershipId(student, options),
    studentId: getStudentId(student, options),
  }));

  decoratedStudents.sort((first, second) => {
    const firstHasName = first.fullName.length > 0;
    const secondHasName = second.fullName.length > 0;

    if (firstHasName !== secondHasName) {
      return firstHasName ? -1 : 1;
    }

    const givenNameCompare = vietnameseNameCollator.compare(
      getGivenName(first.fullName),
      getGivenName(second.fullName),
    );
    if (givenNameCompare !== 0) {
      return givenNameCompare;
    }

    const fullNameCompare = vietnameseNameCollator.compare(first.fullName, second.fullName);
    if (fullNameCompare !== 0) {
      return fullNameCompare;
    }

    const membershipCompare = compareStableId(first.membershipId, second.membershipId);
    if (membershipCompare !== 0) {
      return membershipCompare;
    }

    const studentCompare = compareStableId(first.studentId, second.studentId);
    if (studentCompare !== 0) {
      return studentCompare;
    }

    return first.index - second.index;
  });

  return decoratedStudents.map(({ student }) => student);
}

function getFullName<T>(student: T, options: StudentRosterSortOptions<T>) {
  if (options.getFullName) {
    return options.getFullName(student);
  }

  return "fullName" in Object(student)
    ? (student as { fullName?: string | null }).fullName
    : "";
}

function getMembershipId<T>(student: T, options: StudentRosterSortOptions<T>) {
  if (options.getMembershipId) {
    return options.getMembershipId(student);
  }

  return "membershipId" in Object(student)
    ? (student as { membershipId?: string | number | null }).membershipId
    : undefined;
}

function getStudentId<T>(student: T, options: StudentRosterSortOptions<T>) {
  if (options.getStudentId) {
    return options.getStudentId(student);
  }

  if ("studentId" in Object(student)) {
    return (student as { studentId?: string | number | null }).studentId;
  }

  return "id" in Object(student)
    ? (student as { id?: string | number | null }).id
    : undefined;
}

function normalizeStudentName(name: string | null | undefined) {
  return (name ?? "").trim().replace(/\s+/g, " ");
}

function getGivenName(fullName: string) {
  const parts = fullName.split(" ");
  return parts[parts.length - 1] ?? "";
}

function compareStableId(
  first: string | number | null | undefined,
  second: string | number | null | undefined,
) {
  if (first == null && second == null) {
    return 0;
  }

  if (first == null) {
    return 1;
  }

  if (second == null) {
    return -1;
  }

  return vietnameseNameCollator.compare(String(first), String(second));
}
