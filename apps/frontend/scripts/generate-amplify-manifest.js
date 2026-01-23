#!/usr/bin/env node
/**
 * Generate deploy-manifest.json for AWS Amplify SSR deployment
 * Uses Next.js standalone output - minimal deployment size
 *
 * IMPORTANT: Next.js 15 standalone output puts .next at ROOT level,
 * the server.js expects to find .next relative to itself.
 * Do NOT create duplicate copies at apps/frontend/.next
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', '.next');
const standaloneDir = path.join(buildDir, 'standalone');
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

console.log('Copying standalone build output to .amplify-hosting...');

// Copy standalone directory to compute/default
if (fs.existsSync(standaloneDir)) {
  console.log('Standalone directory contents:', fs.readdirSync(standaloneDir).join(', '));

  // Check if standalone has .next at root (Next.js 15 standalone output)
  const standaloneNextDir = path.join(standaloneDir, '.next');
  if (fs.existsSync(standaloneNextDir)) {
    console.log('Found .next at standalone root - using standalone structure as-is');
    console.log('Standalone .next contents:', fs.readdirSync(standaloneNextDir).slice(0, 15).join(', '));

    // Check for server and app directories
    const standaloneServerDir = path.join(standaloneNextDir, 'server');
    if (fs.existsSync(standaloneServerDir)) {
      console.log('Standalone server dir contents:', fs.readdirSync(standaloneServerDir).slice(0, 15).join(', '));

      const standaloneAppDir = path.join(standaloneServerDir, 'app');
      if (fs.existsSync(standaloneAppDir)) {
        console.log('App Router pages found in standalone:', fs.readdirSync(standaloneAppDir).slice(0, 10).join(', '));
      }
    }
  }

  // Copy standalone directory (server.js, node_modules, .next)
  // This is the complete deployment - no need to add extra copies
  copyRecursive(standaloneDir, computeDir);

  // Remove any apps folder if it exists (monorepo artifact we don't need)
  const appsDir = path.join(computeDir, 'apps');
  if (fs.existsSync(appsDir)) {
    console.log('Removing unnecessary apps folder to save space...');
    fs.rmSync(appsDir, { recursive: true, force: true });
  }
} else {
  console.error('Standalone build not found. Make sure output: "standalone" is set in next.config.js');
  process.exit(1);
}

// Verify the compute directory structure
const computeNextDir = path.join(computeDir, '.next');
console.log('Compute .next exists:', fs.existsSync(computeNextDir));
if (fs.existsSync(computeNextDir)) {
  console.log('Compute .next contents:', fs.readdirSync(computeNextDir).slice(0, 15).join(', '));
}

// Copy public directory to static for CDN serving
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  copyRecursive(publicDir, staticDir);
}

// Copy .next/static to static/_next/static for CDN serving
const nextStaticDir = path.join(buildDir, 'static');
if (fs.existsSync(nextStaticDir)) {
  copyRecursive(nextStaticDir, path.join(staticDir, '_next', 'static'));
}

// Generate Amplify deploy manifest v1
const deployManifest = {
  version: 1,
  routes: [
    {
      path: '/_next/static/*',
      target: {
        kind: 'Static'
      }
    },
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

console.log('Generated deploy-manifest.json');
console.log('Output directory:', outputDir);
console.log('Compute dir contents:', fs.readdirSync(computeDir).join(', '));

// Final diagnostics - check the actual .next at compute root
console.log('\n=== Final .amplify-hosting structure ===');
const finalNextDir = path.join(computeDir, '.next');
console.log('.next contents:', fs.existsSync(finalNextDir) ? fs.readdirSync(finalNextDir).slice(0, 15).join(', ') : 'NOT FOUND');

const finalServerDir = path.join(finalNextDir, 'server');
if (fs.existsSync(finalServerDir)) {
  console.log('.next/server contents:', fs.readdirSync(finalServerDir).slice(0, 15).join(', '));
  const finalAppDir = path.join(finalServerDir, 'app');
  if (fs.existsSync(finalAppDir)) {
    console.log('.next/server/app found with', fs.readdirSync(finalAppDir).length, 'entries');
  }

  // Check for middleware
  const middlewareManifest = path.join(finalServerDir, 'middleware-manifest.json');
  if (fs.existsSync(middlewareManifest)) {
    console.log('Middleware manifest found');
  } else {
    console.log('WARNING: middleware-manifest.json missing');
  }
}
