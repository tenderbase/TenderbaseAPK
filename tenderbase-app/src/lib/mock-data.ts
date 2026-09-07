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
    matchScore: 94,
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
    matchScore: 91,
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
    matchScore: 84,
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
    matchScore: 76,
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
    matchScore: 68,
  },
];

export const MOCK_STATS = { newThisWeek: 42, closingSoon: 8, saved: 17 };

export const MOCK_SUMMARY = {
  tenderId: 'eth-it-2026-091',
  overview:
    'This tender seeks a supplier to deliver desktop computers, laptops and peripherals to municipal offices across eThekwini over a 12-month period.',
  keyPoints: [
    { text: 'Estimated contract value of R2.4 million, delivered in phased batches.', citationIndex: 1 },
    { text: 'Compulsory briefing session held 4 September 2026 — attendance certificate required.', citationIndex: 3 },
    { text: 'Minimum B-BBEE Level 4; preference points allocated on the 80/20 scoring system.', citationIndex: 2 },
    { text: 'Delivery to 6 municipal sites within 30 days of purchase order.', citationIndex: 1 },
  ],
  citations: [
    { index: 1, documentId: 'd1', documentName: 'Tender Specification Document', pageRange: 'Pages 3–7 · PDF' },
    { index: 2, documentId: 'd3', documentName: 'SBD Forms (1, 4, 6.1, 9)', pageRange: 'Page 2 · PDF' },
    { index: 3, documentId: 'd4', documentName: 'Addendum No. 1 — Briefing Minutes', pageRange: 'Page 1 · PDF' },
  ],
  generatedAt: new Date().toISOString(),
  model: 'tenderbase-summary-v1',
};

export const MOCK_MATCH = {
  tenderId: 'eth-it-2026-091',
  score: 79,
  factors: [
    { key: 'category' as const, label: 'Category — IT & Technology', score: 100, note: 'Exact match' },
    { key: 'province' as const, label: 'Province — KwaZulu-Natal', score: 100, note: 'Exact match' },
    { key: 'value' as const, label: 'Value in your range', score: 88, note: 'R2.4M' },
    { key: 'compliance' as const, label: 'Compliance readiness', score: 75, note: '3 of 4' },
    { key: 'timeToBid' as const, label: 'Time to prepare bid', score: 45, note: '10 days' },
  ],
  warnings: [
    {
      text: 'The compulsory briefing was held on 4 September 2026. Confirm your attendance certificate is on file, otherwise the bid may be disqualified.',
      citationIndex: 3,
    },
  ],
};
