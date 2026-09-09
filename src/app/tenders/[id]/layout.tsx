import { AppShell } from '@/components/shell/AppShell';

/**
 * /tenders/[id] sits OUTSIDE the (app) route group on purpose: notFound()
 * thrown inside a route group renders but keeps HTTP 200 in this Next
 * version, while the same throw from this layout tree returns a genuine
 * 404. The shell (nav/drawer/saved store) is identical to (app).
 */
export default function TendersLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
