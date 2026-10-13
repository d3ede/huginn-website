const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function allowedOrigin(requestOrigin: string | undefined, appOrigin: string): boolean {
  if (!requestOrigin) return false;
  const configured = new URL(appOrigin);
  if (requestOrigin === configured.origin) return true;
  if (!loopbackHosts.has(configured.hostname)) return false;
  try {
    const requested = new URL(requestOrigin);
    return (
      requestOrigin === requested.origin &&
      loopbackHosts.has(requested.hostname) &&
      requested.protocol === configured.protocol &&
      requested.port === configured.port
    );
  } catch {
    return false;
  }
}
