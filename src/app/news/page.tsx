import type { Metadata } from 'next';
import { NewsView } from './NewsView';

export const metadata: Metadata = {
  title: 'News · TenderBase',
  description: 'SA tender-adjacent news — government, construction, finance, tax and technology.',
};

export default function NewsPage() {
  return <NewsView />;
}
