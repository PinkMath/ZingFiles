export type ObjectUrlResource = { readonly url: string };
export type RevokeObjectUrl = (url: string) => void;

export function revokeObjectUrls<T extends ObjectUrlResource>(
  resources: Iterable<T>,
  revoke: RevokeObjectUrl = URL.revokeObjectURL,
): void {
  for (const resource of resources) revoke(resource.url);
}

export function removeAndRevokeObjectUrls<T extends ObjectUrlResource>(
  current: Readonly<Record<string, T>>,
  shouldRemove: (resource: T) => boolean,
  revoke: RevokeObjectUrl = URL.revokeObjectURL,
): Record<string, T> {
  const next: Record<string, T> = {};
  for (const [key, resource] of Object.entries(current)) {
    if (shouldRemove(resource)) revoke(resource.url);
    else next[key] = resource;
  }
  return next;
}
