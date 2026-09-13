/** Keep stored photo URLs HTTPS while routing demo images to the local emulator. */
export function photoSource(path: string): string {
  if (
    import.meta.env?.['VITE_USE_FIREBASE_EMULATORS'] !== 'true' ||
    typeof window === 'undefined' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
  )
    return path;
  try {
    const url = new URL(path);
    if (
      url.origin === 'https://firebasestorage.googleapis.com' &&
      url.pathname.startsWith('/v0/b/demo-personal-website.appspot.com/o/website-profile%2F')
    ) {
      url.protocol = 'http:';
      url.host = '127.0.0.1:9199';
      return url.href;
    }
  } catch {
    /* Local /profile/ assets need no mapping. */
  }
  return path;
}
