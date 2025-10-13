#!/usr/bin/env python
"""
Comprehensive test runner script for the movie booking application.
Provides different test execution modes and reporting options.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movie_booking_app.settings')

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: {description} failed")
        print(f"Return code: {e.returncode}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Run tests for movie booking app')
    parser.add_argument('--unit', action='store_true', help='Run unit tests only')
    parser.add_argument('--integration', action='store_true', help='Run integration tests only')
    parser.add_argument('--performance', action='store_true', help='Run performance tests only')
    parser.add_argument('--coverage', action='store_true', help='Run with coverage report')
    parser.add_argument('--fast', action='store_true', help='Run fast tests only (exclude slow)')
    parser.add_argument('--parallel', type=int, help='Run tests in parallel (specify number of processes)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--failfast', '-x', action='store_true', help='Stop on first failure')
    
    args = parser.parse_args()
    
    # Base pytest command
    cmd = ['python', '-m', 'pytest']
    
    # Add test selection based on arguments
    if args.unit:
        cmd.extend(['-m', 'unit'])
    elif args.integration:
        cmd.extend(['-m', 'integration'])
    elif args.performance:
        cmd.extend(['-m', 'performance'])
    elif args.fast:
        cmd.extend(['-m', 'not slow'])
    
    # Add coverage if requested
    if args.coverage:
        cmd.extend(['--cov=.', '--cov-report=html', '--cov-report=term-missing'])
    
    # Add parallel execution
    if args.parallel:
        cmd.extend(['-n', str(args.parallel)])
    
    # Add verbose output
    if args.verbose:
        cmd.append('-v')
    
    # Add fail fast
    if args.failfast:
        cmd.append('-x')
    
    # Run the tests
    success = run_command(cmd, "Running tests")
    
    if success:
        print("\n✅ All tests passed!")
        if args.coverage:
            print("📊 Coverage report generated in htmlcov/index.html")
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)

if __name__ == '__main__':
    main()