/** Deliberately authored messages that are safe to show in the editor. */
export class CmsError extends Error {}

/** Replace SDK and validation errors without exposing credentials or document contents. */
export async function safe<T>(message: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw error instanceof CmsError ? error : new Error(message);
  }
}
