import type { Metadata } from 'next';
import { CompanyProfileView } from './CompanyProfileView';

export const metadata: Metadata = {
  title: 'Company Profile · TenderBase',
};

export default function CompanyProfilePage() {
  return <CompanyProfileView />;
}
