export function buildCdnUrl(key: string): string {
  const CDN_BASE = process.env.UPLOADCARE_CDN_BASE;
  return `${CDN_BASE}/${key}/-/quality/smart/`;
}
