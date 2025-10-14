# Movie & Event Booking App - Frontend

A modern React application built with TypeScript, Vite, and Tailwind CSS for booking movies and events.

## 🚀 Features

- **Modern Tech Stack**: React 19, TypeScript, Vite, Tailwind CSS
- **Type Safety**: Strict TypeScript configuration with comprehensive type checking
- **Code Quality**: ESLint + Prettier with strict rules and automatic formatting
- **Design System**: Custom Tailwind CSS configuration with design tokens
- **Path Aliases**: Clean imports with @ aliases for better organization
- **Environment Configuration**: Comprehensive environment variable setup
- **Development Tools**: Hot reload, proxy configuration, and development utilities

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, etc.)
│   ├── layout/         # Layout components (Header, Footer, etc.)
│   ├── forms/          # Form components
│   └── common/         # Shared components
├── pages/              # Page components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard pages
│   ├── events/         # Event-related pages
│   ├── theaters/       # Theater-related pages
│   ├── bookings/       # Booking-related pages
│   └── admin/          # Admin pages
├── services/           # API and external services
│   ├── api/            # API client and endpoints
│   ├── auth/           # Authentication services
│   ├── booking/        # Booking services
│   ├── payment/        # Payment services
│   └── notification/   # Notification services
├── hooks/              # Custom React hooks
├── contexts/           # React contexts
├── utils/              # Utility functions and constants
├── types/              # TypeScript type definitions
├── assets/             # Static assets
└── styles/             # Global styles
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Update environment variables in `.env.local` with your configuration

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

## 🎨 Design System

The application uses a custom Tailwind CSS configuration with:

- **Color Palette**: Primary, secondary, accent, success, warning, and error colors
- **Typography**: Inter and Poppins fonts with responsive sizing
- **Spacing**: Extended spacing scale for consistent layouts
- **Animations**: Custom animations for smooth interactions
- **Components**: Pre-built component classes for consistency

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for full list):

- `VITE_API_BASE_URL` - Backend API URL
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe payment integration
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps integration
- `VITE_WS_BASE_URL` - WebSocket connection URL

### Path Aliases

The following aliases are configured:

- `@/*` - src directory
- `@/components/*` - components directory
- `@/pages/*` - pages directory
- `@/services/*` - services directory
- `@/utils/*` - utils directory
- `@/types/*` - types directory
- `@/hooks/*` - hooks directory
- `@/contexts/*` - contexts directory

## 📝 Code Standards

- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Strict rules for code quality and consistency
- **Prettier**: Automatic code formatting
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Imports**: Absolute imports using path aliases
- **Components**: Functional components with TypeScript interfaces

## 🚀 Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. The built files will be in the `dist` directory

3. Deploy the `dist` directory to your hosting platform

## 🤝 Contributing

1. Follow the established code standards
2. Run linting and formatting before committing
3. Ensure TypeScript compilation passes
4. Write meaningful commit messages

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)