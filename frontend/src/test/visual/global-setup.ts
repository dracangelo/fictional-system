import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Set up test data or authentication if needed
  await page.goto('http://localhost:5173')
  
  // You can set up global state here, like:
  // - Creating test users
  // - Seeding test data
  // - Setting up authentication tokens
  
  // Example: Set up authentication
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'test-token')
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'test-user',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer'
    }))
  })

  await browser.close()
}

export default globalSetup