import { AppShell } from '@/components/shell/AppShell';

/**
 * Authenticated shell. Bottom tab bar on mobile, sidebar from md up —
 * the route group keeps auth/onboarding screens free of navigation.
 *
 * The drawer lives here so its state survives navigation between screens.
 * SavedProvider gives every screen one shared source of truth for the
 * signed-in identity and saved tenders (guests are routed to sign-in
 * when they try to save — nothing is faked).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
