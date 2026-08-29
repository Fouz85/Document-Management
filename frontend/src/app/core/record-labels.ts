/** Mirrors the backend's RecordLabels.SectionOrDepartment: a request's `department` is stored as
 * "Unit - Section" (e.g. "المدارس - مدرسة الوكرة الثانوية للبنين") — listings only need the section
 * (or the unit itself when there is no section, e.g. ministry-level requests). */
export function sectionOrDepartment(department: string | null | undefined): string {
  if (!department) return department ?? '';
  const parts = department.split(' - ');
  const unit = parts[0];
  const section = parts.slice(1).join(' - ');
  return section || unit;
}
