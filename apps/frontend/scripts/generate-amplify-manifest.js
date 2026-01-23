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
  console.log('Standalone directory contents:', fs.readdirSync(standaloneDir).join(', '));

  // Check what's in the standalone apps/frontend/.next directory
  const standaloneAppNext = path.join(standaloneDir, 'apps', 'frontend', '.next');
  if (fs.existsSync(standaloneAppNext)) {
    console.log('Standalone .next contents:', fs.readdirSync(standaloneAppNext).join(', '));

    // Check for server directory in standalone
    const standaloneServer = path.join(standaloneAppNext, 'server');
    if (fs.existsSync(standaloneServer)) {
      console.log('Standalone server dir contents:', fs.readdirSync(standaloneServer).slice(0, 15).join(', '));
    }
  } else {
    console.log('Standalone .next directory not found at:', standaloneAppNext);
  }

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

// The standalone output needs the full .next directory at apps/frontend/.next
// This might not be included in standalone, so copy the entire .next build output
const appNextDir = path.join(computeDir, 'apps', 'frontend', '.next');
console.log('Checking .next in standalone:', fs.existsSync(appNextDir) ? 'exists' : 'missing');

// Ensure apps/frontend directory exists
const appFrontendDir = path.join(computeDir, 'apps', 'frontend');
if (!fs.existsSync(appFrontendDir)) {
  fs.mkdirSync(appFrontendDir, { recursive: true });
}

// Copy only essential .next files (to stay under 230MB limit)
if (!fs.existsSync(appNextDir)) {
  fs.mkdirSync(appNextDir, { recursive: true });
}

// Essential files/directories for App Router SSR
const essentialItems = [
  'server',           // Server-side rendering code (includes app/ for App Router)
  'BUILD_ID',         // Build identifier
  'build-manifest.json',
  'prerender-manifest.json',
  'react-loadable-manifest.json',
  'routes-manifest.json',
  'required-server-files.json',
  'app-build-manifest.json',
  'app-path-routes-manifest.json',
  // Middleware files (critical for Clerk auth)
  'middleware-manifest.json',
  'middleware-build-manifest.json',
  'next-minimal-server.js.nft.json',
  'next-server.js.nft.json',
  // Cache and trace files
  'cache',
  'trace'
];

console.log('Copying essential .next files...');
console.log('Contents of buildDir:', fs.readdirSync(buildDir).join(', '));

essentialItems.forEach(item => {
  const src = path.join(buildDir, item);
  const dest = path.join(appNextDir, item);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    console.log(`  Copied: ${item}`);
  } else {
    console.log(`  Missing: ${item}`);
  }
});

// Debug: Show what's in the server directory
const serverDir = path.join(buildDir, 'server');
if (fs.existsSync(serverDir)) {
  console.log('Contents of .next/server:', fs.readdirSync(serverDir).join(', '));

  // Check for App Router
  const appDir = path.join(serverDir, 'app');
  if (fs.existsSync(appDir)) {
    console.log('App Router pages found:', fs.readdirSync(appDir).slice(0, 10).join(', '));
  } else {
    console.log('WARNING: No .next/server/app directory - App Router may not work!');
  }
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

// Final diagnostics
console.log('\n=== Final .amplify-hosting structure ===');
console.log('apps/frontend/.next contents:', fs.existsSync(appNextDir) ? fs.readdirSync(appNextDir).join(', ') : 'NOT FOUND');

const finalServerDir = path.join(appNextDir, 'server');
if (fs.existsSync(finalServerDir)) {
  console.log('apps/frontend/.next/server contents:', fs.readdirSync(finalServerDir).slice(0, 15).join(', '));
  const finalAppDir = path.join(finalServerDir, 'app');
  if (fs.existsSync(finalAppDir)) {
    console.log('apps/frontend/.next/server/app found with', fs.readdirSync(finalAppDir).length, 'entries');
  }
}

// Check for middleware in final build
const middlewareManifest = path.join(appNextDir, 'server', 'middleware-manifest.json');
if (fs.existsSync(middlewareManifest)) {
  console.log('Middleware manifest found in server dir');
} else {
  console.log('WARNING: middleware-manifest.json not in server dir - middleware may not work');
}
