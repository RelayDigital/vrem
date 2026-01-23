#!/usr/bin/env node
/**
 * Generate deploy-manifest.json for AWS Amplify SSR deployment
 * This script creates the required manifest for Next.js 14/15 apps
 * Based on Amplify Hosting SSR deployment manifest schema
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', '.next');
const outputDir = path.join(__dirname, '..', '.amplify-hosting');

// Create output directories
const computeDir = path.join(outputDir, 'compute', 'default');
const staticDir = path.join(outputDir, 'static');

[computeDir, staticDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Copy build output recursively
const copyRecursive = (src, dest) => {
  if (!fs.existsSync(src)) return;

  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

console.log('Copying build output to .amplify-hosting...');

// Copy .next directory to compute/default
copyRecursive(buildDir, path.join(computeDir, '.next'));

// Copy node_modules to compute/default
const nodeModulesDir = path.join(__dirname, '..', 'node_modules');
if (fs.existsSync(nodeModulesDir)) {
  console.log('Copying node_modules...');
  copyRecursive(nodeModulesDir, path.join(computeDir, 'node_modules'));
}

// Copy package.json to compute/default
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  fs.copyFileSync(packageJsonPath, path.join(computeDir, 'package.json'));
}

// Copy public directory to static
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  copyRecursive(publicDir, staticDir);
}

// Copy .next/static to static/_next/static
const nextStaticDir = path.join(buildDir, 'static');
if (fs.existsSync(nextStaticDir)) {
  copyRecursive(nextStaticDir, path.join(staticDir, '_next', 'static'));
}

// Read routes manifest
const routesManifestPath = path.join(buildDir, 'routes-manifest.json');
let routesManifest = {};
if (fs.existsSync(routesManifestPath)) {
  routesManifest = JSON.parse(fs.readFileSync(routesManifestPath, 'utf-8'));
}

// Generate Amplify deploy manifest v1
const deployManifest = {
  version: 1,
  routes: [
    // Static assets route
    {
      path: '/_next/static/*',
      target: {
        kind: 'Static'
      }
    },
    // Public assets route
    {
      path: '/*.*',
      target: {
        kind: 'Static'
      },
      fallback: {
        kind: 'Compute',
        src: 'default'
      }
    },
    // All other routes go to compute
    {
      path: '/*',
      target: {
        kind: 'Compute',
        src: 'default'
      }
    }
  ],
  computeResources: [
    {
      name: 'default',
      entrypoint: 'server.js',
      runtime: 'nodejs20.x'
    }
  ],
  framework: {
    name: 'next.js',
    version: '15.5.9'
  }
};

// Write deploy manifest
fs.writeFileSync(
  path.join(outputDir, 'deploy-manifest.json'),
  JSON.stringify(deployManifest, null, 2)
);

// Create a simple server.js that starts Next.js
const serverJs = `
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(\`> Ready on http://\${hostname}:\${port}\`);
  });
});
`;

fs.writeFileSync(path.join(computeDir, 'server.js'), serverJs);

console.log('Generated deploy-manifest.json');
console.log('Generated server.js');
console.log('Output directory:', outputDir);
