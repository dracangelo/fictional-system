# Design System Components

This directory contains the comprehensive design system for the Movie and Event Booking App frontend. The design system provides a consistent set of reusable UI components built with React, TypeScript, and Tailwind CSS.

## Architecture

The design system is organized into the following categories:

- **UI Components** (`/ui`): Base interactive components like buttons, inputs, cards, modals
- **Layout Components** (`/layout`): Structural components for page layout and content organization
- **Form Components** (`/forms`): Specialized form-related components (future implementation)
- **Common Components** (`/common`): Shared utility components (future implementation)

## Design Tokens

The design system uses a comprehensive set of design tokens defined in:
- `src/styles/theme.ts` - TypeScript theme configuration
- `tailwind.config.js` - Tailwind CSS configuration

### Color Palette

- **Primary**: Blue tones for main actions and branding
- **Secondary**: Gray tones for text and subtle elements
- **Accent**: Red tones for highlights and emphasis
- **Success**: Green tones for positive feedback
- **Warning**: Yellow/orange tones for caution
- **Error**: Red tones for errors and destructive actions

### Typography

- **Font Family**: Inter (body text), Poppins (headings)
- **Font Sizes**: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl
- **Line Heights**: Optimized for readability

### Spacing

- **Scale**: 0.5rem to 4rem with consistent increments
- **Custom Values**: 18 (4.5rem), 88 (22rem), 128 (32rem)

## UI Components

### Button

A versatile button component with multiple variants and sizes.

```tsx
import { Button } from '@/components/ui'

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="success">Success</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// States and Icons
<Button loading>Loading</Button>
<Button leftIcon={<Icon />}>With Left Icon</Button>
<Button rightIcon={<Icon />}>With Right Icon</Button>
```

### Input

A flexible input component with validation states and icons.

```tsx
import { Input } from '@/components/ui'

<Input
  label="Email"
  placeholder="Enter your email"
  leftIcon={<SearchIcon />}
  error="This field is required"
  helperText="We'll never share your email"
/>
```

### TextArea

A multi-line text input with character counting.

```tsx
import { TextArea } from '@/components/ui'

<TextArea
  label="Description"
  placeholder="Enter description"
  maxLength={500}
  showCharCount
  helperText="Describe your event"
/>
```

### Select

A dropdown select component with customizable options.

```tsx
import { Select } from '@/components/ui'

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
]

<Select
  label="Category"
  placeholder="Select a category"
  options={options}
/>
```

### Card

A flexible container component for grouping related content.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

### Modal

A modal dialog component with backdrop and keyboard navigation.

```tsx
import { Modal } from '@/components/ui'

<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  description="Modal description"
  size="lg"
>
  Modal content
</Modal>
```

### Badge

A small status indicator component.

```tsx
import { Badge } from '@/components/ui'

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge removable onRemove={() => handleRemove()}>
  Removable
</Badge>
```

## Layout Components

### Grid

A responsive grid system for organizing content.

```tsx
import { Grid, GridItem } from '@/components/layout'

<Grid cols={3} gap={4} responsive>
  <GridItem colSpan={2}>Main content</GridItem>
  <GridItem>Sidebar</GridItem>
</Grid>
```

### Container

A responsive container for page content.

```tsx
import { Container } from '@/components/layout'

<Container size="xl" padding="lg">
  Page content
</Container>
```

### Stack

A flexible layout component for arranging items.

```tsx
import { Stack } from '@/components/layout'

<Stack direction="row" align="center" justify="between" gap={4}>
  <div>Item 1</div>
  <div>Item 2</div>
</Stack>
```

## Utilities

### Class Name Utility

The `cn` utility function merges class names efficiently.

```tsx
import { cn } from '@/utils/cn'

const className = cn(
  'base-classes',
  condition && 'conditional-classes',
  props.className
)
```

## Testing

All components include comprehensive unit tests using Vitest and React Testing Library.

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Accessibility

All components are built with accessibility in mind:

- Proper ARIA labels and descriptions
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Color contrast compliance

## Performance

The design system is optimized for performance:

- Tree-shakable exports
- Minimal bundle size
- Efficient re-renders
- Lazy loading support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

When adding new components:

1. Follow the existing component structure
2. Include TypeScript types
3. Add comprehensive tests
4. Document props and usage
5. Ensure accessibility compliance
6. Test across different screen sizes

## Future Enhancements

- Storybook integration for component documentation
- Additional form components (Checkbox, Radio, Switch)
- Data display components (Table, List, Avatar)
- Feedback components (Toast, Alert, Progress)
- Navigation components (Breadcrumb, Pagination, Tabs)