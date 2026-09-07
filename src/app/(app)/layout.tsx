import { BottomNavigation } from '@/components/nav/BottomNavigation';
import { DrawerProvider } from '@/components/nav/DrawerProvider';
import { MenuDrawer } from '@/components/nav/MenuDrawer';

/**
 * Authenticated shell. Bottom tab bar on mobile, sidebar from md up —
 * the route group keeps auth/onboarding screens free of navigation.
 *
 * The drawer lives here so its state survives navigation between screens.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DrawerProvider>
      <div className="min-h-screen">
        <div className="app-scroll">
          <div className="mx-auto max-w-3xl md:max-w-5xl">{children}</div>
        </div>
        <BottomNavigation alertCount={3} />
        <MenuDrawer />
      </div>
    </DrawerProvider>
  );
}
