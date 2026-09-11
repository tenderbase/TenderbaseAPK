import { BottomNavigation } from '@/components/nav/BottomNavigation';
import { DrawerProvider } from '@/components/nav/DrawerProvider';
import { MenuDrawer } from '@/components/nav/MenuDrawer';
import { SavedProvider } from '@/lib/saved-store';
import { SavedSearchesProvider } from '@/lib/saved-searches-store';
import { NewsBookmarksProvider } from '@/lib/news-bookmarks';
import { TierProvider } from '@/lib/tier-store';
import { AlertsProvider } from '@/lib/alerts-store';
import { UpgradeProvider } from '@/components/tier/UpgradeSheet';
import { TierPreview } from '@/components/tier/TierPreview';
import { getServerTier } from '@/lib/tier-server';

/**
 * The authenticated shell: drawer state + shared saved/session store,
 * bottom tab bar (mobile) / left rail (md+), drawer. Shared by the (app)
 * route group and the top-level /tenders/[id] route.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const { tier, trialEnd, source } = await getServerTier();

  return (
    <DrawerProvider>
      <TierProvider
        initialTier={tier}
        initialTrialEnd={trialEnd}
        billingEnforced={source !== 'cookie'}
      >
        <UpgradeProvider>
          <SavedProvider>
            <SavedSearchesProvider>
              <NewsBookmarksProvider>
                <AlertsProvider>
                  <div className="min-h-screen w-full min-w-0 md:pl-[248px]">
                    <div className="app-scroll w-full min-w-0">
                      <div className="mx-auto w-full max-w-7xl min-w-0">{children}</div>
                    </div>
                    <BottomNavigation />
                    <MenuDrawer />
                  </div>
                  <TierPreview />
                </AlertsProvider>
              </NewsBookmarksProvider>
            </SavedSearchesProvider>
          </SavedProvider>
        </UpgradeProvider>
      </TierProvider>
    </DrawerProvider>
  );
}
