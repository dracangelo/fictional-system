import React, { useState } from 'react'
import {
  Button,
  Input,
  TextArea,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Modal,
  Badge,
  Grid,
  Container,
  Stack,
} from '../index'
import { Search, Heart, Star } from 'lucide-react'

const selectOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
]

export const ComponentShowcase: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  return (
    <Container>
      <Stack gap={8}>
        <div>
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">
            Design System Components
          </h1>
          <p className="text-lg text-secondary-600">
            A showcase of all available UI components in our design system.
          </p>
        </div>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent>
            <Stack direction="row" gap={4}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="success">Success</Button>
            </Stack>
            <Stack direction="row" gap={4}>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </Stack>
            <Stack direction="row" gap={4}>
              <Button loading>Loading</Button>
              <Button leftIcon={<Heart className="h-4 w-4" />}>With Icon</Button>
              <Button rightIcon={<Star className="h-4 w-4" />}>With Icon</Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Form Components */}
        <Card>
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
          </CardHeader>
          <CardContent>
            <Grid cols={2} gap={6}>
              <Input
                label="Email"
                placeholder="Enter your email"
                leftIcon={<Search className="h-4 w-4" />}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                error="Password is required"
              />
              <TextArea
                label="Description"
                placeholder="Enter description"
                helperText="Maximum 500 characters"
                maxLength={500}
                showCharCount
              />
              <Select
                label="Category"
                placeholder="Select a category"
                options={selectOptions}
              />
            </Grid>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <Stack direction="row" gap={4}>
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="outline">Outline</Badge>
            </Stack>
            <Stack direction="row" gap={4}>
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
              <Badge size="lg">Large</Badge>
            </Stack>
            <Stack direction="row" gap={4}>
              <Badge removable onRemove={() => alert('Badge removed!')}>
                Removable
              </Badge>
            </Stack>
          </CardContent>
        </Card>

        {/* Modal Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Modal</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Example Modal"
              description="This is a demonstration of the modal component."
            >
              <p className="text-secondary-600 mb-4">
                This modal demonstrates the design system's modal component with
                proper styling and functionality.
              </p>
              <Stack direction="row" justify="end" gap={3}>
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>Confirm</Button>
              </Stack>
            </Modal>
          </CardContent>
        </Card>

        {/* Layout Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Layout Components</CardTitle>
          </CardHeader>
          <CardContent>
            <Grid cols={3} gap={4}>
              <Card variant="outlined" padding="sm">
                <p className="text-sm text-secondary-600">Grid Item 1</p>
              </Card>
              <Card variant="outlined" padding="sm">
                <p className="text-sm text-secondary-600">Grid Item 2</p>
              </Card>
              <Card variant="outlined" padding="sm">
                <p className="text-sm text-secondary-600">Grid Item 3</p>
              </Card>
            </Grid>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}