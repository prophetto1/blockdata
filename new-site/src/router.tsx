import { createBrowserRouter } from 'react-router-dom';
import MarketingLayout from '@/components/layout/MarketingLayout';
import Landing from '@/pages/marketing/Landing';
import HowItWorks from '@/pages/marketing/HowItWorks';
import UseCases from '@/pages/marketing/UseCases';
import App from '@/App';

export const router = createBrowserRouter([
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/how-it-works', element: <HowItWorks /> },
      { path: '/use-cases', element: <UseCases /> },
    ],
  },
  {
    path: '*',
    element: <App />,
  },
]);
