#!/usr/bin/env node

/**
 * Build optimization script for production builds
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DIST_DIR = 'dist';
const STATS_FILE = join(DIST_DIR, 'stats.json');

console.log('🚀 Starting build optimization...');

// Step 1: Clean previous build
console.log('🧹 Cleaning previous build...');
try {
  execSync('rm -rf dist', { stdio: 'inherit' });
} catch (error) {
  console.log('No previous build to clean');
}

// Step 2: Run production build
console.log('📦 Building for production...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 3: Analyze bundle size
console.log('📊 Analyzing bundle size...');
try {
  const distFiles = execSync('find dist -name "*.js" -o -name "*.css"', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

  const analysis = {
    totalFiles: distFiles.length,
    files: [],
    totalSize: 0,
    gzippedSize: 0,
  };

  for (const file of distFiles) {
    if (existsSync(file)) {
      const stats = execSync(`stat -c%s "${file}"`, { encoding: 'utf8' }).trim();
      const size = parseInt(stats, 10);
      
      // Get gzipped size
      let gzippedSize = 0;
      try {
        const gzipStats = execSync(`gzip -c "${file}" | wc -c`, { encoding: 'utf8' }).trim();
        gzippedSize = parseInt(gzipStats, 10);
      } catch (e) {
        // Fallback estimation
        gzippedSize = Math.round(size * 0.3);
      }

      analysis.files.push({
        path: file,
        size,
        gzippedSize,
        type: file.endsWith('.js') ? 'javascript' : 'css',
      });

      analysis.totalSize += size;
      analysis.gzippedSize += gzippedSize;
    }
  }

  // Sort by size (largest first)
  analysis.files.sort((a, b) => b.size - a.size);

  // Write analysis to file
  writeFileSync(
    join(DIST_DIR, 'bundle-analysis.json'),
    JSON.stringify(analysis, null, 2)
  );

  console.log('\n📈 Bundle Analysis:');
  console.log(`Total files: ${analysis.totalFiles}`);
  console.log(`Total size: ${formatBytes(analysis.totalSize)}`);
  console.log(`Gzipped size: ${formatBytes(analysis.gzippedSize)}`);
  console.log(`Compression ratio: ${((1 - analysis.gzippedSize / analysis.totalSize) * 100).toFixed(1)}%`);

  console.log('\n🔍 Largest files:');
  analysis.files.slice(0, 5).forEach((file, index) => {
    console.log(`${index + 1}. ${file.path.replace('dist/', '')} - ${formatBytes(file.size)} (${formatBytes(file.gzippedSize)} gzipped)`);
  });

  // Check for performance budget violations
  const budgetViolations = [];
  
  // JavaScript budget: 250KB gzipped
  const jsFiles = analysis.files.filter(f => f.type === 'javascript');
  const totalJsSize = jsFiles.reduce((sum, f) => sum + f.gzippedSize, 0);
  if (totalJsSize > 250 * 1024) {
    budgetViolations.push(`JavaScript bundle too large: ${formatBytes(totalJsSize)} (budget: 250KB)`);
  }

  // CSS budget: 50KB gzipped
  const cssFiles = analysis.files.filter(f => f.type === 'css');
  const totalCssSize = cssFiles.reduce((sum, f) => sum + f.gzippedSize, 0);
  if (totalCssSize > 50 * 1024) {
    budgetViolations.push(`CSS bundle too large: ${formatBytes(totalCssSize)} (budget: 50KB)`);
  }

  // Individual file budget: 100KB gzipped
  const largeFiles = analysis.files.filter(f => f.gzippedSize > 100 * 1024);
  if (largeFiles.length > 0) {
    largeFiles.forEach(file => {
      budgetViolations.push(`Large file: ${file.path.replace('dist/', '')} - ${formatBytes(file.gzippedSize)} (budget: 100KB)`);
    });
  }

  if (budgetViolations.length > 0) {
    console.log('\n⚠️  Performance Budget Violations:');
    budgetViolations.forEach(violation => {
      console.log(`   ${violation}`);
    });
  } else {
    console.log('\n✅ All performance budgets met!');
  }

} catch (error) {
  console.error('❌ Bundle analysis failed:', error.message);
}

// Step 4: Generate performance report
console.log('\n📋 Generating performance report...');
try {
  const report = {
    buildTime: new Date().toISOString(),
    bundleAnalysis: existsSync(join(DIST_DIR, 'bundle-analysis.json')) 
      ? JSON.parse(readFileSync(join(DIST_DIR, 'bundle-analysis.json'), 'utf8'))
      : null,
    recommendations: generateRecommendations(),
  };

  writeFileSync(
    join(DIST_DIR, 'performance-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('✅ Performance report generated: dist/performance-report.json');
} catch (error) {
  console.error('❌ Performance report generation failed:', error.message);
}

console.log('\n🎉 Build optimization complete!');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateRecommendations() {
  return [
    'Enable gzip compression on your server',
    'Use a CDN for static asset delivery',
    'Implement HTTP/2 server push for critical resources',
    'Consider using WebP images for better compression',
    'Enable browser caching with appropriate cache headers',
    'Monitor Core Web Vitals in production',
    'Use resource hints (preload, prefetch) for critical resources',
  ];
}