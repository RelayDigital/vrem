import express from 'express';
import { apiReference } from '@scalar/express-api-reference';

const app = express();
const port = process.env.PORT || 3002;

// The backend API URL that serves the OpenAPI JSON spec at /api-json
const API_URL = process.env.API_URL || 'http://localhost:3001';

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve Scalar API Reference at /reference
app.use(
  '/reference',
  apiReference({
    url: `${API_URL}/api-json`,
    theme: 'kepler',
    pageTitle: 'VREM API Reference',
  }),
);

// Redirect root to /reference
app.get('/', (_req, res) => {
  res.redirect('/reference');
});

app.listen(port, () => {
  console.log(`API docs server running at http://localhost:${port}/reference`);
  console.log(`OpenAPI spec from: ${API_URL}/api-json`);
});
