import type { Metadata } from 'next';
import { ProHubView } from './ProHubView';

export const metadata: Metadata = {
  title: 'Pro · TenderBase',
};

export default function ProPage() {
  return <ProHubView />;
}
