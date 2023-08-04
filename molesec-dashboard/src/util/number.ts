export function isNumber(value: unknown): value is number {
  return typeof value !== "boolean" && !isNaN(Number(value));
}
