import type { TenderWithUserState } from '@/types/tender';

/**
 * Realistic South African fixture data for local development and the visual
 * prototype. Swap `tenderApi` in when the backend is live — component props
 * do not change.
 */

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export const MOCK_TENDERS: TenderWithUserState[] = [
  {
    id: 'eth-it-2026-091',
    tenderNumber: 'ETH/IT/2026/091',
    title: 'Supply and Delivery of Computer Equipment',
    description:
      'Supply and delivery of computer equipment and related accessories for municipal offices across the eThekwini metropolitan region.',
    organisation: 'eThekwini Municipality',
    category: 'IT & Technology',
    province: 'KwaZulu-Natal',
    location: 'KwaZulu-Natal',
    valueCents: 240_000_000,
    publishedDate: daysFromNow(-5),
    closingDate: daysFromNow(10),
    sourceUrl: null,
    documents: [
      { id: 'd1', name: 'Tender Specification Document', fileType: 'pdf', sizeBytes: 2_516_582, updatedAt: daysFromNow(-3), url: '', isAddendum: false },
      { id: 'd2', name: 'Bill of Quantities', fileType: 'xlsx', sizeBytes: 491_520, updatedAt: daysFromNow(-5), url: '', isAddendum: false },
      { id: 'd3', name: 'SBD Forms (1, 4, 6.1, 9)', fileType: 'pdf', sizeBytes: 1_153_434, updatedAt: daysFromNow(-5), url: '', isAddendum: false },
      { id: 'd4', name: 'Addendum No. 1 — Briefing Minutes', fileType: 'pdf', sizeBytes: 348_160, updatedAt: daysFromNow(-1), url: '', isAddendum: true },
    ],
    contactInformation: {
      department: 'Supply Chain Management Unit',
      contactPerson: 'N. Dlamini',
      email: 'scm@durban.gov.za',
      phone: '+27 31 311 1111',
    },
    isSaved: true,
    savedAt: daysFromNow(-2),
    matchScore: null,
  },
  {
    id: 'znq-2026-08421',
    tenderNumber: 'ZNQ-2026-08421',
    title: 'Provision of Security Services',
    description: 'Provision of physical security services at departmental facilities for a period of 24 months.',
    organisation: 'KZN Department of Public Works',
    category: 'Security',
    province: 'KwaZulu-Natal',
    location: 'Durban, KwaZulu-Natal',
    valueCents: 870_000_000,
    publishedDate: daysFromNow(-9),
    closingDate: daysFromNow(2),
    sourceUrl: null,
    documents: [],
    contactInformation: null,
    isSaved: true,
    savedAt: daysFromNow(-5),
    matchScore: null,
  },
  {
    id: 'msu-sec-2026-117',
    tenderNumber: 'MSU/SEC/2026/117',
    title: 'Security Guarding Services for Municipal Facilities',
    description: 'Appointment of a service provider for security guarding at municipal buildings.',
    organisation: 'Msunduzi Local Municipality',
    category: 'Security',
    province: 'KwaZulu-Natal',
    location: 'Pietermaritzburg, KZN',
    valueCents: 320_000_000,
    publishedDate: daysFromNow(-2),
    closingDate: daysFromNow(22),
    sourceUrl: null,
    documents: [],
    contactInformation: null,
    isSaved: false,
    savedAt: null,
    matchScore: null,
  },
  {
    id: 'tnpa-2026-0934',
    tenderNumber: 'TNPA/2026/0934',
    title: 'Access Control and CCTV Monitoring Systems',
    description: 'Installation and maintenance of access control and CCTV monitoring systems at port facilities.',
    organisation: 'Transnet SOC Ltd',
    category: 'Security',
    province: 'KwaZulu-Natal',
    location: 'Durban, KwaZulu-Natal',
    valueCents: 1_250_000_000,
    publishedDate: daysFromNow(-12),
    closingDate: daysFromNow(6),
    sourceUrl: null,
    documents: [],
    contactInformation: null,
    isSaved: false,
    savedAt: null,
    matchScore: null,
  },
  {
    id: 'kzn-health-2026-442',
    tenderNumber: 'ZNB-2026-00442',
    title: 'Cleaning and Hygiene Services: Regional Offices',
    description: 'Provision of cleaning and hygiene services to regional offices for a period of 36 months.',
    organisation: 'Department of Health, KZN',
    category: 'Cleaning',
    province: 'KwaZulu-Natal',
    location: 'Pietermaritzburg, KZN',
    valueCents: 190_000_000,
    publishedDate: daysFromNow(-7),
    closingDate: daysFromNow(5),
    sourceUrl: null,
    documents: [],
    contactInformation: null,
    isSaved: false,
    savedAt: null,
    matchScore: null,
  },
];

export const MOCK_STATS = { newThisWeek: 42, closingSoon: 8, saved: 17 };
