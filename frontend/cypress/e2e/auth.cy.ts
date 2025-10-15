describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.clearTestData()
  })

  describe('Login', () => {
    it('should login successfully with valid credentials', () => {
      // Mock successful login API response
      cy.mockApiResponse('POST', '/api/auth/login/', {
        user: {
          id: '1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'customer'
        },
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token'
      })

      cy.visit('/auth/login')
      
      // Check page elements
      cy.get('[data-testid="email-input"]').should('be.visible')
      cy.get('[data-testid="password-input"]').should('be.visible')
      cy.get('[data-testid="login-submit"]').should('be.visible')
      
      // Fill form
      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="password-input"]').type('password123')
      
      // Submit form
      cy.get('[data-testid="login-submit"]').click()
      
      // Wait for API call
      cy.waitForApi('apiCall')
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard')
      
      // Should show user info
      cy.get('[data-testid="user-menu"]').should('contain', 'John')
    })

    it('should show error for invalid credentials', () => {
      // Mock failed login API response
      cy.mockApiResponse('POST', '/api/auth/login/', {
        statusCode: 401,
        body: { message: 'Invalid credentials' }
      })

      cy.visit('/auth/login')
      
      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="password-input"]').type('wrongpassword')
      cy.get('[data-testid="login-submit"]').click()
      
      cy.waitForApi('apiCall')
      
      // Should show error message
      cy.get('[data-testid="error-message"]').should('contain', 'Invalid credentials')
      
      // Should stay on login page
      cy.url().should('include', '/auth/login')
    })

    it('should validate form fields', () => {
      cy.visit('/auth/login')
      
      // Submit empty form
      cy.get('[data-testid="login-submit"]').click()
      
      // Should show validation errors
      cy.get('[data-testid="email-error"]').should('contain', 'Email is required')
      cy.get('[data-testid="password-error"]').should('contain', 'Password is required')
      
      // Test invalid email format
      cy.get('[data-testid="email-input"]').type('invalid-email')
      cy.get('[data-testid="password-input"]').click() // blur email field
      
      cy.get('[data-testid="email-error"]').should('contain', 'Invalid email format')
    })

    it('should toggle password visibility', () => {
      cy.visit('/auth/login')
      
      const passwordInput = cy.get('[data-testid="password-input"]')
      const toggleButton = cy.get('[data-testid="password-toggle"]')
      
      // Initially password should be hidden
      passwordInput.should('have.attr', 'type', 'password')
      
      // Click toggle to show password
      toggleButton.click()
      passwordInput.should('have.attr', 'type', 'text')
      
      // Click toggle to hide password
      toggleButton.click()
      passwordInput.should('have.attr', 'type', 'password')
    })

    it('should remember user preference', () => {
      cy.mockApiResponse('POST', '/api/auth/login/', {
        user: { id: '1', email: 'test@example.com', firstName: 'John' },
        token: 'mock-token'
      })

      cy.visit('/auth/login')
      
      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="password-input"]').type('password123')
      cy.get('[data-testid="remember-me"]').check()
      cy.get('[data-testid="login-submit"]').click()
      
      cy.waitForApi('apiCall')
      
      // Check that remember me was sent in request
      cy.get('@apiCall').should((interception) => {
        expect(interception.request.body).to.have.property('rememberMe', true)
      })
    })
  })

  describe('Registration', () => {
    it('should register successfully with valid data', () => {
      cy.mockApiResponse('POST', '/api/auth/register/', {
        user: {
          id: '1',
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
          role: 'customer'
        },
        token: 'mock-jwt-token'
      })

      cy.visit('/auth/register')
      
      // Fill registration form
      cy.get('[data-testid="first-name-input"]').type('New')
      cy.get('[data-testid="last-name-input"]').type('User')
      cy.get('[data-testid="email-input"]').type('newuser@example.com')
      cy.get('[data-testid="password-input"]').type('password123')
      cy.get('[data-testid="confirm-password-input"]').type('password123')
      cy.get('[data-testid="terms-checkbox"]').check()
      
      cy.get('[data-testid="register-submit"]').click()
      
      cy.waitForApi('apiCall')
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard')
    })

    it('should validate password confirmation', () => {
      cy.visit('/auth/register')
      
      cy.get('[data-testid="password-input"]').type('password123')
      cy.get('[data-testid="confirm-password-input"]').type('differentpassword')
      cy.get('[data-testid="email-input"]').click() // blur confirm password field
      
      cy.get('[data-testid="confirm-password-error"]').should('contain', 'Passwords do not match')
    })

    it('should require terms acceptance', () => {
      cy.visit('/auth/register')
      
      // Fill all fields except terms
      cy.get('[data-testid="first-name-input"]').type('New')
      cy.get('[data-testid="last-name-input"]').type('User')
      cy.get('[data-testid="email-input"]').type('newuser@example.com')
      cy.get('[data-testid="password-input"]').type('password123')
      cy.get('[data-testid="confirm-password-input"]').type('password123')
      
      cy.get('[data-testid="register-submit"]').click()
      
      cy.get('[data-testid="terms-error"]').should('contain', 'You must accept the terms')
    })
  })

  describe('Password Reset', () => {
    it('should send password reset email', () => {
      cy.mockApiResponse('POST', '/api/auth/password-reset/', {
        message: 'Password reset email sent'
      })

      cy.visit('/auth/forgot-password')
      
      cy.get('[data-testid="email-input"]').type('test@example.com')
      cy.get('[data-testid="reset-submit"]').click()
      
      cy.waitForApi('apiCall')
      
      cy.get('[data-testid="success-message"]').should('contain', 'Password reset email sent')
    })

    it('should reset password with valid token', () => {
      cy.mockApiResponse('POST', '/api/auth/password-reset-confirm/', {
        message: 'Password reset successful'
      })

      cy.visit('/auth/reset-password?token=valid-token')
      
      cy.get('[data-testid="new-password-input"]').type('newpassword123')
      cy.get('[data-testid="confirm-password-input"]').type('newpassword123')
      cy.get('[data-testid="reset-confirm-submit"]').click()
      
      cy.waitForApi('apiCall')
      
      cy.get('[data-testid="success-message"]').should('contain', 'Password reset successful')
      cy.url().should('include', '/auth/login')
    })
  })

  describe('Logout', () => {
    it('should logout successfully', () => {
      cy.seedTestData()
      cy.mockApiResponse('POST', '/api/auth/logout/', { message: 'Logged out' })
      
      cy.visit('/dashboard')
      
      // Open user menu and logout
      cy.get('[data-testid="user-menu"]').click()
      cy.get('[data-testid="logout-button"]').click()
      
      cy.waitForApi('apiCall')
      
      // Should redirect to home page
      cy.url().should('not.include', '/dashboard')
      cy.url().should('include', '/')
      
      // Should clear user data
      cy.window().then((win) => {
        expect(win.localStorage.getItem('auth_token')).to.be.null
        expect(win.localStorage.getItem('auth_user')).to.be.null
      })
    })
  })

  describe('Protected Routes', () => {
    it('should redirect to login for protected routes when not authenticated', () => {
      cy.visit('/dashboard')
      
      // Should redirect to login
      cy.url().should('include', '/auth/login')
      cy.get('[data-testid="redirect-message"]').should('contain', 'Please log in to continue')
    })

    it('should allow access to protected routes when authenticated', () => {
      cy.seedTestData()
      
      cy.visit('/dashboard')
      
      // Should stay on dashboard
      cy.url().should('include', '/dashboard')
      cy.get('[data-testid="dashboard-content"]').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should be accessible on login page', () => {
      cy.visit('/auth/login')
      cy.checkA11y()
    })

    it('should be accessible on registration page', () => {
      cy.visit('/auth/register')
      cy.checkA11y()
    })

    it('should support keyboard navigation', () => {
      cy.visit('/auth/login')
      
      // Tab through form elements
      cy.get('body').tab()
      cy.focused().should('have.attr', 'data-testid', 'email-input')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'password-input')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'password-toggle')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'remember-me')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'login-submit')
    })
  })
})