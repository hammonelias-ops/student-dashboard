// Only allow redirects to paths inside this app ("/grades"), never to other sites ("//evil.com").
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
