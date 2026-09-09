import { BottomNavigation } from '@/components/nav/BottomNavigation';
import { DrawerProvider } from '@/components/nav/DrawerProvider';
import { MenuDrawer } from '@/components/nav/MenuDrawer';
import { SavedProvider } from '@/lib/saved-store';
import { TierProvider } from '@/lib/tier-store';
import { AlertsProvider } from '@/lib/alerts-store';
import { UpgradeProvider } from '@/components/tier/UpgradeSheet';
import { TierPreview } from '@/components/tier/TierPreview';
import { getServerTier } from '@/lib/tier-server';

/**
 * The authenticated shell: drawer state + shared saved/session store,
 * bottom tab bar (mobile) / left rail (md+), drawer. Shared by the (app)
 * route group and the top-level /tenders/[id] route — which lives outside
 * the group because a notFound() thrown inside a route group does not set
 * the 404 status in this Next version (verified with probes in dev and
 * prod), while the same throw outside the group does.
 *
 * Provider order matters: TierProvider seeds from cookies server-side,
 * UpgradeProvider gives every screen the universal Pro gate, SavedProvider
 * uses both (its cap enforcement opens the upgrade sheet), and
 * AlertsProvider derives its real deadline/trial events from those stores.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const { tier, trialEnd } = getServerTier();

  return (
    <DrawerProvider>
      <TierProvider initialTier={tier} initialTrialEnd={trialEnd}>
        <UpgradeProvider>
          <SavedProvider>
            <AlertsProvider>
              <div className="min-h-screen">
                <div className="app-scroll">
                  <div className="mx-auto max-w-3xl md:max-w-5xl">{children}</div>
                </div>
                <BottomNavigation />
                <MenuDrawer />
              </div>
              <TierPreview />
            </AlertsProvider>
          </SavedProvider>
        </UpgradeProvider>
      </TierProvider>
    </DrawerProvider>
  );
}
