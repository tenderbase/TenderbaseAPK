import type { Metadata } from 'next';
import { PreferencesView } from './PreferencesView';

export const metadata: Metadata = {
  title: 'Tender Preferences · TenderBase',
};

export default function PreferencesPage() {
  return <PreferencesView />;
}
