import { newsItemId } from '@/lib/news-rss';
import type { NewsItem } from '@/types/news';

/**
 * Verbatim captures from live SA news feeds, taken 2026-09-09 via a remote
 * fetch of each registry feed:
 *
 *   sanews            https://www.sanews.gov.za/rss.xml
 *   businesstech      https://businesstech.co.za/news/feed/
 *   infrastructurenews https://www.infrastructurenews.co.za/feed/
 *   mybroadband       https://mybroadband.co.za/news/feed
 *   moneyweb          https://www.moneyweb.co.za/feed/
 *
 * These are NOT invented stories. Every title, URL, timestamp and summary
 * below came from the live feed. Where a feed published no summary, `dek`
 * is '' and the card renders without one — nothing is fabricated to fill
 * the gap. Like the tender fixtures, they exist so dev/test previews stay
 * demoable without outbound network; production renders live feeds and the
 * outage/fixture envelope only appears when a feed is unreachable.
 *
 * Refresh with a fetch of the URL above (see lib/news.server.ts).
 */

export const FIXTURE_NEWS_CAPTURED_AT = '2026-09-09';

function item(sourceId: string, title: string, url: string, publishedAt: string | null, dek = ''): NewsItem {
  return { id: newsItemId(sourceId, url), sourceId, title, dek, url, publishedAt };
}

export const FIXTURE_NEWS: Record<string, NewsItem[]> = {
  sanews: [
    item(
      'sanews',
      'SA stands at an extraordinary convergence of four historic milestones',
      'https://www.sanews.gov.za/south-africa/sa-stands-extraordinary-convergence-four-historic-milestones',
      '2026-09-08T16:32:03+02:00',
      'This year, South Africa stands at an extraordinary convergence of four historic milestones, which paved the way for the country\u2019s freedom and laid the foundation for a democratic dawn, Deputy Minister in The Presidency Kenny Morolong said at the Limpopo leg of the Milestones of Freedom campaign.',
    ),
    item(
      'sanews',
      'KZN Public Works secures first clean audit',
      'https://www.sanews.gov.za/south-africa/kzn-public-works-secures-first-clean-audit',
      '2026-09-08T15:32:02+02:00',
      'The KwaZulu-Natal Department of Public Works and Infrastructure has achieved a clean audit from the Auditor-General South Africa (AGSA) for the first time in the department\u2019s history.',
    ),
    item(
      'sanews',
      'Calls for stronger regional action against GBVF',
      'https://www.sanews.gov.za/south-africa/calls-stronger-regional-action-against-gbvf',
      '2026-09-08T15:08:31+02:00',
      'Deputy Minister in the Presidency for Women, Youth and Persons with Disabilities Mmapaseka Steve Letsike has called for stronger regional cooperation and collective action to accelerate efforts to end gender-based violence and femicide (GBVF) across Southern Africa.',
    ),
  ],

  businesstech: [
    item(
      'businesstech',
      "The man in line to inherit Johann Rupert's billions lands a new job",
      'https://businesstech.co.za/news/business/874476/the-man-in-line-to-inherit-johann-ruperts-billions-lands-a-new-job/',
      '2026-09-09T07:35:20+00:00',
    ),
    item(
      'businesstech',
      'The private company costing South Africa R20 billion a year',
      'https://businesstech.co.za/news/energy/874172/the-private-company-costing-south-africa-r20-billion-a-year/',
      '2026-09-09T07:05:13+00:00',
    ),
    item(
      'businesstech',
      'GoTyme Bank wants South Africans to stop paying fees to move their money instantly',
      'https://businesstech.co.za/news/industry-news/874466/gotyme-bank-wants-south-africans-to-stop-paying-fees-to-move-their-money-instantly/',
      '2026-09-09T06:50:46+00:00',
    ),
    item(
      'businesstech',
      'New lifeline for homeowners in the Western Cape',
      'https://businesstech.co.za/news/business/874445/new-lifeline-for-homeowners-in-the-western-cape/',
      '2026-09-08T14:55:19+00:00',
    ),
    item(
      'businesstech',
      "Billionaire Patrice Motsepe's bet backfires, taking R2.4 billion with it",
      'https://businesstech.co.za/news/business/874430/billionaire-patrice-motsepes-bet-backfires-taking-r2-4-billion-with-it/',
      '2026-09-08T13:48:47+00:00',
    ),
    item(
      'businesstech',
      "South Africa's newest R4 billion bank hopes to break even by 2028",
      'https://businesstech.co.za/news/banking/874446/south-africas-newest-r4-billion-bank-hopes-to-break-even-by-2028/',
      '2026-09-08T13:43:04+00:00',
    ),
    item(
      'businesstech',
      "The drivers taking over South Africa's roads",
      'https://businesstech.co.za/news/business/874151/the-drivers-taking-over-south-africas-roads/',
      '2026-09-08T11:29:47+00:00',
    ),
  ],

  infrastructurenews: [
    item(
      'infrastructurenews',
      'Mayor Morero Breaks Ground For The Biodigester Pilot Plant',
      'https://infrastructurenews.co.za/2026/09/09/mayor-morero-breaks-ground-for-the-biodigester-pilot-plant/',
      '2026-09-09T07:33:34+00:00',
      'The City of Johannesburg officially broke ground on Tuesday, 08 September 2026, on a biodigester pilot plant at the Robinson Deep Landfill site, launching a municipal-scale project designed to convert organic waste into renewable energy and reduce landfill dependence.',
    ),
    item(
      'infrastructurenews',
      "Government Late Payments Threaten Plans To 'Turn SA Into A Construction Site'",
      'https://infrastructurenews.co.za/2026/09/09/government-late-payments-threaten-plans-to-turn-sa-into-a-construction-site/',
      '2026-09-09T04:12:46+00:00',
      "Government late payments are putting pressure on South Africa's construction sector, threatening cash flow, contractors and infrastructure ambitions, according to construction law specialist MDA Attorneys. National and provincial departments owed R15.5 billion across 90,856 invoices unpaid for more than 30 days by the third quarter of 2025/26.",
    ),
    item(
      'infrastructurenews',
      'Restored Letaba Bridge And Tourism Units Open As National Parks Week Begins',
      'https://infrastructurenews.co.za/2026/09/09/restored-letaba-bridge-and-tourism-units-open-as-national-parks-week-begins/',
      '2026-09-09T04:01:43+00:00',
      'The South African National Parks (SANParks) has marked the start of National Parks Week with the handover of tourism units and the official opening of the Letaba High Water Bridge at Letaba Rest Camp in Limpopo, following flood damage in January.',
    ),
  ],

  mybroadband: [
    item(
      'mybroadband',
      'Takealot has 11 new names',
      'https://mybroadband.co.za/news/trending/666670-takealot-has-11-new-names.html',
      '2026-09-09T07:34:28+00:00',
    ),
    item(
      'mybroadband',
      'Apple launching $2,000 foldable iPhone, and software engineers train fly brain to play Doom',
      'https://mybroadband.co.za/news/trending/666662-apple-launching-2000-foldable-iphone-and-software-engineers-train-fly-brain-to-play-doom.html',
      '2026-09-09T06:26:16+00:00',
    ),
    item(
      'mybroadband',
      'EasyEquities and crypto companies in alliance against South African Reserve Bank and National Treasury',
      'https://mybroadband.co.za/news/cryptocurrency/666654-easyequities-and-crypto-companies-in-alliance-against-south-african-reserve-bank-and-national-treasury.html',
      '2026-09-09T05:00:00+00:00',
    ),
    item(
      'mybroadband',
      'Department of Transport allegedly spent R15 million to stream on YouTube',
      'https://mybroadband.co.za/news/government/666333-department-of-transport-allegedly-spent-r15-million-to-stream-on-youtube.html',
      '2026-09-08T13:36:55+00:00',
    ),
    item(
      'mybroadband',
      'Large KFC franchise operator in South Africa hit by 536GB data breach',
      'https://mybroadband.co.za/news/security/666413-large-kfc-franchise-operator-in-south-africa-hit-by-536gb-data-breach.html',
      '2026-09-08T09:01:06+00:00',
    ),
    item(
      'mybroadband',
      'Vodacom beats MTN in top South African malls',
      'https://mybroadband.co.za/news/cellular/662641-vodacom-beats-mtn-in-top-south-african-malls.html',
      '2026-09-08T15:00:26+00:00',
    ),
  ],

  moneyweb: [
    item(
      'moneyweb',
      'US escalates Canada trade war with product bans, new tariffs',
      'https://www.moneyweb.co.za/news/international/us-escalates-canada-trade-war-with-product-bans-new-tariffs/',
      '2026-09-09T08:00:49+00:00',
    ),
    item(
      'moneyweb',
      'Brent oil hits $100 as US-Iran war shows little sign of abating',
      'https://www.moneyweb.co.za/news/markets/brent-oil-hits-100-as-us-iran-war-shows-little-sign-of-abating/',
      '2026-09-09T07:51:29+00:00',
    ),
    item(
      'moneyweb',
      'Metals fall from record high in London as Mideast tensions flare',
      'https://www.moneyweb.co.za/mineweb/metals-fall-from-record-high-in-london-as-mideast-tensions-flare/',
      '2026-09-09T07:30:43+00:00',
    ),
    item(
      'moneyweb',
      'US pursues deportees abroad for hundreds of millions in unpaid fines',
      'https://www.moneyweb.co.za/news/international/us-pursues-deportees-abroad-for-hundreds-of-millions-in-unpaid-fines/',
      '2026-09-09T07:00:51+00:00',
    ),
    item(
      'moneyweb',
      'Platinum market seen swinging to surplus on investor selling',
      'https://www.moneyweb.co.za/mineweb/platinum-market-seen-swinging-to-surplus-on-investor-selling/',
      '2026-09-09T06:30:54+00:00',
    ),
    item(
      'moneyweb',
      'Gold edges higher as weaker dollar offsets inflation risks',
      'https://www.moneyweb.co.za/mineweb/gold-edges-higher-as-weaker-dollar-offsets-inflation-risks/',
      '2026-09-09T06:27:56+00:00',
    ),
  ],
};
