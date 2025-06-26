import { createBrowserRouter } from 'react-router-dom';
import Layout from '../layouts/MainLayout';
import Home from '../pages/Home';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      children: [
        {
          path: '/',
          element: <Home />,
        },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
    },
  }
);

export default router; 