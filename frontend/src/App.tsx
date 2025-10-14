import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts';
import { QueryProvider } from './providers/QueryProvider';
import { router } from './router';
import './App.css';

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
