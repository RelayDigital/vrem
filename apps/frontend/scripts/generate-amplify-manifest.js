#!/usr/bin/env node
/**
 * Generate deploy-manifest.json for AWS Amplify SSR deployment
 * Uses Next.js standalone output for minimal deployment size
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
  // Copy the entire standalone directory (includes server.js and node_modules)
  copyRecursive(standaloneDir, computeDir);

  // For monorepo, the actual app might be in apps/frontend subfolder
  // We need to adjust the server.js to point to the right location
  const standaloneAppDir = path.join(computeDir, 'apps', 'frontend');
  if (fs.existsSync(standaloneAppDir)) {
    console.log('Detected monorepo structure, adjusting paths...');
  }
} else {
  console.error('Standalone build not found. Make sure output: "standalone" is set in next.config.js');
  process.exit(1);
}

// Copy .next/static to compute for runtime (required for standalone)
const nextStaticDir = path.join(buildDir, 'static');
const computeStaticDir = path.join(computeDir, 'apps', 'frontend', '.next', 'static');
if (fs.existsSync(nextStaticDir)) {
  copyRecursive(nextStaticDir, computeStaticDir);
}

// Also copy to root .next/static in case server.js looks there
const rootComputeStatic = path.join(computeDir, '.next', 'static');
if (fs.existsSync(nextStaticDir) && !fs.existsSync(rootComputeStatic)) {
  copyRecursive(nextStaticDir, rootComputeStatic);
}

// Copy public directory to static for CDN serving
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  copyRecursive(publicDir, staticDir);
}

// Copy .next/static to static/_next/static for CDN serving
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
