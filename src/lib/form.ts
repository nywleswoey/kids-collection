/** Read a form field as a string, defaulting a missing value to "". */
export function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}
