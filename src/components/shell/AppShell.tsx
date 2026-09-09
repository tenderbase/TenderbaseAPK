import { BottomNavigation } from '@/components/nav/BottomNavigation';
import { DrawerProvider } from '@/components/nav/DrawerProvider';
import { MenuDrawer } from '@/components/nav/MenuDrawer';
import { SavedProvider } from '@/lib/saved-store';

/**
 * The authenticated shell: drawer state + shared saved/session store,
 * bottom tab bar (mobile) / left rail (md+), drawer. Shared by the (app)
 * route group and the top-level /tenders/[id] route — which lives outside
 * the group because a notFound() thrown inside a route group does not set
 * the 404 status in this Next version (verified with probes in dev and
 * prod), while the same throw outside the group does.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DrawerProvider>
      <SavedProvider>
        <div className="min-h-screen">
          <div className="app-scroll">
            <div className="mx-auto max-w-3xl md:max-w-5xl">{children}</div>
          </div>
          <BottomNavigation />
          <MenuDrawer />
        </div>
      </SavedProvider>
    </DrawerProvider>
  );
}
