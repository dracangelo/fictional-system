#!/usr/bin/env node

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

class TestRunner {
  constructor() {
    this.results = {
      unit: { status: 'pending', duration: 0, coverage: 0 },
      accessibility: { status: 'pending', duration: 0, violations: 0 },
      performance: { status: 'pending', duration: 0, benchmarks: {} },
      e2e: { status: 'pending', duration: 0, tests: 0 },
      visual: { status: 'pending', duration: 0, screenshots: 0 },
      build: { status: 'pending', duration: 0, size: 0 },
    }
    this.startTime = Date.now()
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
  }

  logSection(title) {
    this.log(`\n${'='.repeat(60)}`, 'cyan')
    this.log(`${title}`, 'cyan')
    this.log(`${'='.repeat(60)}`, 'cyan')
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      
      this.log(`Running: ${command}`, 'blue')
      
      const child = spawn('npm', ['run', command], {
        stdio: 'inherit',
        cwd: process.cwd(),
        ...options,
      })

      child.on('close', (code) => {
        const duration = Date.now() - startTime
        
        if (code === 0) {
          this.log(`✅ ${command} completed in ${duration}ms`, 'green')
          resolve({ success: true, duration })
        } else {
          this.log(`❌ ${command} failed with code ${code}`, 'red')
          resolve({ success: false, duration, code })
        }
      })

      child.on('error', (error) => {
        this.log(`❌ ${command} error: ${error.message}`, 'red')
        reject(error)
      })
    })
  }

  async runUnitTests() {
    this.logSection('Running Unit Tests')
    
    try {
      const result = await this.runCommand('test:coverage')
      this.results.unit.status = result.success ? 'passed' : 'failed'
      this.results.unit.duration = result.duration

      // Parse coverage report
      try {
        const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json')
        if (fs.existsSync(coverageFile)) {
          const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'))
          this.results.unit.coverage = coverage.total.lines.pct
          this.log(`Coverage: ${coverage.total.lines.pct}%`, 'yellow')
        }
      } catch (error) {
        this.log(`Warning: Could not parse coverage report`, 'yellow')
      }

      return result.success
    } catch (error) {
      this.results.unit.status = 'error'
      return false
    }
  }

  async runAccessibilityTests() {
    this.logSection('Running Accessibility Tests')
    
    try {
      const result = await this.runCommand('test:accessibility')
      this.results.accessibility.status = result.success ? 'passed' : 'failed'
      this.results.accessibility.duration = result.duration

      return result.success
    } catch (error) {
      this.results.accessibility.status = 'error'
      return false
    }
  }

  async runPerformanceTests() {
    this.logSection('Running Performance Tests')
    
    try {
      const result = await this.runCommand('test:performance')
      this.results.performance.status = result.success ? 'passed' : 'failed'
      this.results.performance.duration = result.duration

      return result.success
    } catch (error) {
      this.results.performance.status = 'error'
      return false
    }
  }

  async runE2ETests() {
    this.logSection('Running E2E Tests')
    
    // Start development server
    this.log('Starting development server...', 'blue')
    const server = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      cwd: process.cwd(),
    })

    // Wait for server to be ready
    await this.waitForServer('http://localhost:5173')

    try {
      const result = await this.runCommand('test:e2e')
      this.results.e2e.status = result.success ? 'passed' : 'failed'
      this.results.e2e.duration = result.duration

      return result.success
    } catch (error) {
      this.results.e2e.status = 'error'
      return false
    } finally {
      // Kill development server
      server.kill()
    }
  }

  async runVisualTests() {
    this.logSection('Running Visual Regression Tests')
    
    // Start development server if not already running
    this.log('Starting development server for visual tests...', 'blue')
    const server = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      cwd: process.cwd(),
    })

    await this.waitForServer('http://localhost:5173')

    try {
      const result = await this.runCommand('test:visual')
      this.results.visual.status = result.success ? 'passed' : 'failed'
      this.results.visual.duration = result.duration

      return result.success
    } catch (error) {
      this.results.visual.status = 'error'
      return false
    } finally {
      server.kill()
    }
  }

  async runBuildTest() {
    this.logSection('Running Build Test')
    
    try {
      const result = await this.runCommand('build')
      this.results.build.status = result.success ? 'passed' : 'failed'
      this.results.build.duration = result.duration

      // Check bundle sizes
      if (result.success) {
        await this.analyzeBundleSize()
      }

      return result.success
    } catch (error) {
      this.results.build.status = 'error'
      return false
    }
  }

  async analyzeBundleSize() {
    try {
      const distPath = path.join(process.cwd(), 'dist', 'assets')
      const files = fs.readdirSync(distPath)
      
      let totalSize = 0
      files.forEach(file => {
        const filePath = path.join(distPath, file)
        const stats = fs.statSync(filePath)
        totalSize += stats.size
      })

      this.results.build.size = totalSize
      this.log(`Total bundle size: ${(totalSize / 1024).toFixed(2)} KB`, 'yellow')

      // Check size limits
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (totalSize > maxSize) {
        this.log(`⚠️  Bundle size exceeds ${maxSize / 1024 / 1024}MB limit`, 'yellow')
      }
    } catch (error) {
      this.log(`Warning: Could not analyze bundle size: ${error.message}`, 'yellow')
    }
  }

  async waitForServer(url, timeout = 30000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          this.log(`Server is ready at ${url}`, 'green')
          return true
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    throw new Error(`Server at ${url} did not start within ${timeout}ms`)
  }

  generateReport() {
    this.logSection('Test Results Summary')
    
    const totalDuration = Date.now() - this.startTime
    let passedTests = 0
    let totalTests = 0

    Object.entries(this.results).forEach(([suite, result]) => {
      totalTests++
      const status = result.status === 'passed' ? '✅' : 
                    result.status === 'failed' ? '❌' : 
                    result.status === 'error' ? '💥' : '⏳'
      
      if (result.status === 'passed') passedTests++
      
      this.log(`${status} ${suite.toUpperCase()}: ${result.status} (${result.duration}ms)`)
      
      // Additional details
      if (suite === 'unit' && result.coverage) {
        this.log(`   Coverage: ${result.coverage}%`)
      }
      if (suite === 'build' && result.size) {
        this.log(`   Bundle size: ${(result.size / 1024).toFixed(2)} KB`)
      }
    })

    this.log(`\nOverall: ${passedTests}/${totalTests} test suites passed`, 
             passedTests === totalTests ? 'green' : 'red')
    this.log(`Total duration: ${totalDuration}ms`, 'blue')

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      results: this.results,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        success: passedTests === totalTests,
      }
    }

    fs.writeFileSync('test-results.json', JSON.stringify(report, null, 2))
    this.log('\nDetailed report saved to test-results.json', 'cyan')

    return passedTests === totalTests
  }

  async runAll() {
    this.log('🚀 Starting comprehensive test suite...', 'bright')
    
    const suites = [
      { name: 'Unit Tests', fn: () => this.runUnitTests() },
      { name: 'Accessibility Tests', fn: () => this.runAccessibilityTests() },
      { name: 'Performance Tests', fn: () => this.runPerformanceTests() },
      { name: 'Build Test', fn: () => this.runBuildTest() },
      { name: 'E2E Tests', fn: () => this.runE2ETests() },
      { name: 'Visual Tests', fn: () => this.runVisualTests() },
    ]

    for (const suite of suites) {
      try {
        await suite.fn()
      } catch (error) {
        this.log(`Error in ${suite.name}: ${error.message}`, 'red')
      }
    }

    const success = this.generateReport()
    
    if (success) {
      this.log('\n🎉 All tests passed!', 'green')
      process.exit(0)
    } else {
      this.log('\n💥 Some tests failed!', 'red')
      process.exit(1)
    }
  }

  async runSuite(suiteName) {
    const suites = {
      unit: () => this.runUnitTests(),
      accessibility: () => this.runAccessibilityTests(),
      performance: () => this.runPerformanceTests(),
      e2e: () => this.runE2ETests(),
      visual: () => this.runVisualTests(),
      build: () => this.runBuildTest(),
    }

    if (!suites[suiteName]) {
      this.log(`Unknown test suite: ${suiteName}`, 'red')
      this.log(`Available suites: ${Object.keys(suites).join(', ')}`, 'yellow')
      process.exit(1)
    }

    const success = await suites[suiteName]()
    this.generateReport()
    
    process.exit(success ? 0 : 1)
  }
}

// CLI interface
const args = process.argv.slice(2)
const runner = new TestRunner()

if (args.length === 0) {
  runner.runAll()
} else if (args[0] === '--suite' && args[1]) {
  runner.runSuite(args[1])
} else if (args[0] === '--help') {
  console.log(`
Usage:
  node test-runner.js                    # Run all test suites
  node test-runner.js --suite <name>     # Run specific test suite
  node test-runner.js --help             # Show this help

Available test suites:
  unit          Unit and integration tests
  accessibility Accessibility compliance tests
  performance   Performance benchmarks
  e2e           End-to-end tests
  visual        Visual regression tests
  build         Build and bundle analysis
`)
} else {
  console.log('Invalid arguments. Use --help for usage information.')
  process.exit(1)
}