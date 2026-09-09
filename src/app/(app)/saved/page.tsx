import type { Metadata } from 'next';
import { SavedHubView } from './SavedHubView';
import { isSavedHubTab, type SavedHubTab } from '@/lib/saved-hub';

export const metadata: Metadata = {
  title: 'Saved · TenderBase',
  description: 'Your saved tenders, searches and issuers — one place.',
};

export default function SavedPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab: SavedHubTab = isSavedHubTab(searchParams.tab) ? searchParams.tab : 'tenders';
  return <SavedHubView initialTab={tab} />;
}
