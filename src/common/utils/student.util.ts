type StudentEmailSource = { id: string; email: string | null; regNo: string | null };

/**
 * Paystack's initialize endpoint requires an email, but registering with a
 * bare reg number leaves Student.email null (see auth.service.ts). Paystack
 * only needs it to be syntactically valid in test mode, not deliverable.
 */
export function resolveEmailForPaystack(student: StudentEmailSource): string {
  if (student.email) return student.email;
  if (student.regNo) return `${student.regNo}@students.futo.edu.ng`;
  return `${student.id}@students.futo.edu.ng`;
}
