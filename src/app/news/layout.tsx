import { AppShell } from '@/components/shell/AppShell';

/**
 * /news lives OUTSIDE the (app) route group for the same reason /tenders
 * does: notFound() inside a route group keeps HTTP 200 in this Next version,
 * while the same throw from this layout tree returns a genuine 404. The
 * shell (nav/drawer/stores) is identical to (app).
 */
export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
