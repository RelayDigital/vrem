import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_URL =
  process.env.API_URL || 'https://d2mg6uv6rzxb1j.cloudfront.net';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VREM API Reference</title>
  <style>body { margin: 0; }</style>
</head>
<body>
  <script
    id="api-reference"
    data-url="${API_URL}/api-json"
    data-configuration='${JSON.stringify({ theme: 'kepler' })}'
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
