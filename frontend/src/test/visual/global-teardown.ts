import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  // Clean up any global resources
  console.log('Visual tests completed')
}

export default globalTeardown