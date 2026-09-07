import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginView } from './LoginView';

export const metadata: Metadata = {
  title: 'Sign in · TenderBase',
};

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to avoid opting the whole
  // route into client-side rendering.
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
