import { newsItemId } from '@/lib/news-rss';
import type { NewsItem } from '@/types/news';

/**
 * Verbatim captures from live SA news feeds, taken 2026-09-10 via a remote
 * fetch of each registry feed:
 *
 *   citizenbusiness   https://www.citizen.co.za/business/feed/
 *   sanews            https://www.sanews.gov.za/rss.xml
 *   polity            https://www.polity.org.za/page/south-african-news/feed
 *   engineeringnews   https://www.engineeringnews.co.za/page/construction/feed
 *   cconews           https://cceonlinenews.com/feed
 *   mybroadband       https://mybroadband.co.za/news/feed
 *   techcentral       https://techcentral.co.za/feed
 *   moneyweb          https://www.moneyweb.co.za/feed/
 *   moonstone         https://www.moonstone.co.za/feed/
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

export const FIXTURE_NEWS_CAPTURED_AT = '2026-09-10';

function item(sourceId: string, title: string, url: string, publishedAt: string | null, dek = ''): NewsItem {
  return { id: newsItemId(sourceId, url), sourceId, title, dek, url, publishedAt };
}

export const FIXTURE_NEWS: Record<string, NewsItem[]> = {
  citizenbusiness: [
    item(
      'citizenbusiness',
      'No guarantee energy transformation will lower electricity prices, says Ramokgopa',
      'https://www.citizen.co.za/business/no-guarantee-energy-transformation-will-lower-electricity-prices-says-ramokgopa/',
      '2026-09-10T12:29:28+00:00',
      "Minister of Electricity and Energy, Dr Kgosientsho Ramokgopa, has cautioned that transforming South Africa's energy sector does not automatically mean households will see lower electricity prices.",
    ),
    item(
      'citizenbusiness',
      "Sibanye-Stillwater job cuts: Here's what NUM is proposing instead of mine closures and retrenchments",
      'https://www.citizen.co.za/business/sibanye-stillwater-job-cuts-heres-what-num-is-proposing-instead-of-mine-closures-and-retrenchments/',
      '2026-09-10T11:40:19+00:00',
      'The National Union of Mineworkers (Num) in Rustenburg, North West, has urged government to take a closer look at mining giants shutting down operations in South Africa because of declining production.',
    ),
    item(
      'citizenbusiness',
      "Acsa's R400m irregular expenditure headache",
      'https://www.citizen.co.za/business/acsas-r400m-irregular-expenditure-headache/',
      '2026-09-10T04:09:31+00:00',
      "Acsa is a 74.6% government-owned entity that manages SA's nine biggest airports, including OR Tambo International in Gauteng, Cape Town International in the Western Cape, and King Shaka International Airport in KwaZulu-Natal.",
    ),
  ],

  sanews: [
    item(
      'sanews',
      'DPWI to issue a Request for Information for the redevelopment of the Telkom Towers',
      'https://www.sanews.gov.za/south-africa/dpwi-issue-request-information-redevelopment-telkom-towers',
      '2026-09-10T12:23:20+00:00',
      'The Department of Public Works and Infrastructure is set to issue a Request for Information (RFI) for the redevelopment of the Telkom Towers precinct in Pretoria, in a move aimed at transforming the dormant government-owned property into a productive, income-generating asset.',
    ),
    item(
      'sanews',
      'Gauteng Social Development makes strides in fight against GBVF',
      'https://www.sanews.gov.za/south-africa/gauteng-social-development-makes-strides-fight-against-gbvf',
      '2026-09-10T12:20:11+00:00',
      'The Gauteng Department of Social Development says it has made significant strides in the fight against Gender-Based Violence and Femicide (GBVF), with its Victim Empowerment Centres reaching more than 63 000 victims of crime and violence during the 2025/26 financial year.',
    ),
  ],

  polity: [
    item(
      'polity',
      'Hydrogen investment hits $130bn-plus mark on energy security, resilience rise',
      'https://www.polity.org.za/article/hydrogen-investment-hits-130bn-plus-mark-on-energy-security-resilience-rise-2026-09-10',
      '2026-09-10T12:27:00+02:00',
    ),
    item(
      'polity',
      "South Africa's current account records Q2 deficit as Iran war drives up import costs",
      'https://www.polity.org.za/article/south-africas-current-account-records-q2-deficit-as-iran-war-drives-up-import-costs-2026-09-10',
      '2026-09-10T11:13:00+02:00',
    ),
    item(
      'polity',
      'South Africa urged to lock in reforms before Ramaphosa leaves',
      'https://www.polity.org.za/article/south-africa-urged-to-lock-in-reforms-before-ramaphosa-leaves-2026-09-10',
      '2026-09-10T10:40:00+02:00',
    ),
  ],

  engineeringnews: [
    item(
      'engineeringnews',
      'Sentiment in building sector grows in Q3 – FNB/BER Business Confidence Index',
      'https://www.engineeringnews.co.za/article/sentiment-in-building-sector-grows-in-q3-fnbber-business-confidence-index-2026-09-10',
      '2026-09-10T12:09:00+02:00',
    ),
    item(
      'engineeringnews',
      'CEF punts three-phase redevelopment plan for shut KZN refinery',
      'https://www.engineeringnews.co.za/article/cef-punts-three-phase-redevelopment-plan-for-shut-kzn-refinery-2026-09-09',
      '2026-09-09T16:35:00+02:00',
    ),
    item(
      'engineeringnews',
      'Hyprop sets priorities for 2027 and beyond as it targets further growth opportunities',
      'https://www.engineeringnews.co.za/article/hyprop-sets-priorities-for-2027-and-beyond-as-it-targets-further-growth-opportunities-2026-09-09',
      '2026-09-09T10:57:00+02:00',
    ),
  ],

  cconews: [
    item(
      'cconews',
      'From Operator to Algorithm: Bedrock Puts Autonomous Excavators to Work on Live Construction Sites',
      'https://cceonlinenews.com/technology/bedrock-puts-autonomous-excavators-to-work-on-live-construction-sites/',
      '2026-09-07T06:22:35+00:00',
      'For years, autonomous construction equipment has been demonstrated at technology showcases, test grounds and selected pilot projects. The more difficult question has been whether such machines can perform productive work alongside people and conventional equipment on an active commercial site.',
    ),
    item(
      'cconews',
      'South Africa Has R395 Billion in Infrastructure Projects — But Can the Industry Deliver Them?',
      'https://cceonlinenews.com/investment-finance/south-africa-has-r395-billion-in-infrastructure-projects-2/',
      '2026-08-26T18:14:54+00:00',
      'South Africa has put a R395 billion infrastructure pipeline on the table, but the bigger question for the construction industry is no longer whether there are projects to build.',
    ),
  ],

  mybroadband: [
    item(
      'mybroadband',
      'Drone talks stranded hiker through 14-hour Table Mountain rescue',
      'https://mybroadband.co.za/news/gadgets/667002-drone-talks-stranded-hiker-through-14-hour-table-mountain-rescue.html',
      '2026-09-10T12:06:07+00:00',
    ),
    item(
      'mybroadband',
      '150 years in prison for Facebook Marketplace robbers in South Africa',
      'https://mybroadband.co.za/news/security/666996-150-years-in-prison-for-facebook-marketplace-robbers-in-south-africa.html',
      '2026-09-10T12:01:53+00:00',
    ),
    item(
      'mybroadband',
      'Netflix could be forced to carry SABC content in South Africa',
      'https://mybroadband.co.za/news/broadcasting/666989-netflix-could-be-forced-to-carry-sabc-content-in-south-africa.html',
      '2026-09-10T10:34:03+00:00',
    ),
  ],

  techcentral: [
    item(
      'techcentral',
      "South Africa's electric car floodgates are opening",
      'https://techcentral.co.za/affordable-electric-cars-south-africa-festival-of-motoring/285995/',
      '2026-09-10T13:07:12+00:00',
    ),
    item(
      'techcentral',
      'SAPS wants to deploy AI bodycams with facial recognition',
      'https://techcentral.co.za/saps-bodycam-tender-facial-recognition/285986/',
      '2026-09-10T12:06:39+00:00',
    ),
    item(
      'techcentral',
      "Meet the CIO | Shoprite's Chris Shortt on what a supermarket becomes",
      'https://techcentral.co.za/meet-the-cio-chris-shortt-shoprite/285947/',
      '2026-09-09T19:00:34+00:00',
      'Shoprite CTO Chris Shortt on meeting the customer anywhere, the SAP core underneath it, and what happens when new recruits arrive with their own AI agents.',
    ),
  ],

  moneyweb: [
    item(
      'moneyweb',
      '‘Transnet has turned the corner’ as recovery gathers pace',
      'https://www.moneyweb.co.za/moneyweb-podcasts/moneyweb-midday/transnet-has-turned-the-corner-as-recovery-gathers-pace/',
      '2026-09-10T13:05:45+00:00',
    ),
    item(
      'moneyweb',
      'Transnet returns to profitability but long road to recovery remains',
      'https://www.moneyweb.co.za/news/south-africa/transnet-returns-to-profitability-but-long-road-to-recovery-remains/',
      '2026-09-10T11:24:43+00:00',
    ),
    item(
      'moneyweb',
      'South Africa posts widest current account deficit since 2019',
      'https://www.moneyweb.co.za/news/economy/south-africa-posts-widest-current-account-deficit-since-2019/',
      '2026-09-10T10:06:02+00:00',
    ),
  ],

  moonstone: [
    item(
      'moonstone',
      'FSCA explores value-for-money framework for retirement funds',
      'https://www.moonstone.co.za/fsca-explores-value-for-money-framework-for-retirement-funds/',
      '2026-09-10T09:41:46+00:00',
      'The Financial Sector Conduct Authority is exploring a value-for-money framework for retirement funds as part of a broader shift from compliance-based supervision towards assessing the outcomes members receive.',
    ),
    item(
      'moonstone',
      'Are trustees looking at the real cost of retirement-fund fees?',
      'https://www.moonstone.co.za/are-trustees-looking-at-the-real-cost-of-retirement-fund-fees/',
      '2026-09-10T09:37:33+00:00',
      '"The way things are." If you have seen Babe, the 1995 film about a pig who decides he would rather herd sheep than end up on the dinner table, you may remember this phrase, said in the squeaky voices of the three little mice who pop up throughout the film.',
    ),
  ],
};
