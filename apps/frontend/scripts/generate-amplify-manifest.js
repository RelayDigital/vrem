#!/usr/bin/env node
/**
 * Generate deploy-manifest.json for AWS Amplify SSR deployment
 * This script creates the required manifest for Next.js 14/15 apps
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', '.next');
const outputDir = path.join(__dirname, '..', '.amplify-hosting');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read Next.js build manifest
const buildManifestPath = path.join(buildDir, 'build-manifest.json');
const routesManifestPath = path.join(buildDir, 'routes-manifest.json');

let buildManifest = {};
let routesManifest = {};

if (fs.existsSync(buildManifestPath)) {
  buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf-8'));
}

if (fs.existsSync(routesManifestPath)) {
  routesManifest = JSON.parse(fs.readFileSync(routesManifestPath, 'utf-8'));
}

// Generate deploy manifest for Amplify
const deployManifest = {
  version: 1,
  framework: {
    name: 'next',
    version: '15'
  },
  routes: {
    static: [],
    dynamic: [],
    api: []
  },
  computeConfig: {
    runtime: 'nodejs20.x',
    memorySize: 1024,
    timeout: 30
  }
};

// Copy the entire .next directory to .amplify-hosting/compute
const computeDir = path.join(outputDir, 'compute', 'default');
if (!fs.existsSync(computeDir)) {
  fs.mkdirSync(computeDir, { recursive: true });
}

// Copy build output
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
copyRecursive(buildDir, path.join(computeDir, '.next'));

// Copy static assets
const staticDir = path.join(outputDir, 'static');
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}

const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  copyRecursive(publicDir, staticDir);
}

// Copy static files from .next/static
const nextStaticDir = path.join(buildDir, 'static');
if (fs.existsSync(nextStaticDir)) {
  copyRecursive(nextStaticDir, path.join(staticDir, '_next', 'static'));
}

// Write deploy manifest
fs.writeFileSync(
  path.join(outputDir, 'deploy-manifest.json'),
  JSON.stringify(deployManifest, null, 2)
);

console.log('Generated deploy-manifest.json');
console.log('Output directory:', outputDir);
