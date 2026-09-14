import type { SiteContent } from '../content';

/** Validated published content and its optimistic concurrency revision. */
export interface ContentSnapshot {
  content: SiteContent;
  revision: number;
}

/** Account details exposed to the editor; subscriptions alone do not grant access. */
export interface CmsUser {
  uid: string;
  email: string;
}

/** Public content subscriptions and authenticated owner editing operations. */
export interface Cms {
  subscribeContent(
    onValue: (snapshot: ContentSnapshot | null) => void,
    onError: (error: Error) => void,
  ): () => void;
  subscribeAuth(callback: (user: CmsUser | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  isOwner(): Promise<boolean>;
  listOwners(): Promise<string[]>;
  addOwner(email: string): Promise<void>;
  removeOwner(email: string): Promise<void>;
  uploadPhoto(photo: Blob): Promise<string>;
  saveContent(content: SiteContent, expectedRevision: number): Promise<number>;
  loadContent(): Promise<ContentSnapshot | null>;
}
