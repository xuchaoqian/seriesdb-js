export function extractErrorMsg(event: Event): string {
  return ((event.target as IDBRequest).error as DOMException).message;
}
