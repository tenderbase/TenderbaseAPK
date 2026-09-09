import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  storyCategory,
  relevantToProfile,
  rankNewsFeed,
  pickCrossLink,
} from '@/lib/news-relevance';

const ctx = {
  profile: { legalName: 'Durban Builders (Pty) Ltd', province: 'KwaZulu-Natal', city: 'Durban' },
  preferences: { categories: ['Construction'], provinces: ['KwaZulu-Natal'] },
};

const item = (title, dek = '') => ({
  id: `s:${title}`,
  sourceId: 's',
  title,
  dek,
  url: `https://example.za/${title}`,
  publishedAt: '2026-09-09T07:00:00Z',
});

test('storyCategory detects a construction story from title text', () => {
  assert.equal(storyCategory('government late payments threaten the construction sector'.toLowerCase()), 'Construction');
  assert.equal(storyCategory('new fibre network for schools'.toLowerCase()), 'IT & Technology');
  assert.equal(storyCategory('summit discusses gender-based violence'.toLowerCase()), null);
});

test('relevantToProfile matches on category, province and company token', () => {
  const catHit = relevantToProfile(item('City breaks ground on construction project', ''), ctx);
  assert.equal(catHit.matched, true);
  assert.ok(catHit.reasons.includes('Construction'));

  const provHit = relevantToProfile(item('New KwaZulu-Natal road programme announced', ''), ctx);
  assert.equal(provHit.matched, true);
  assert.ok(provHit.reasons.includes('KwaZulu-Natal'));

  const orgHit = relevantToProfile(item('Airports company appoints Durban Builders to terminal job', ''), ctx);
  assert.equal(orgHit.matched, true);
  assert.ok(orgHit.reasons.some((r) => r.includes('durban')) || orgHit.reasons.some((r) => r.includes('builders')));

  const miss = relevantToProfile(item('Banking giant reports record profits', ''), ctx);
  assert.equal(miss.matched, false);
  assert.deepEqual(miss.reasons, []);
});

test('rankNewsFeed moves matched stories first and reports a real count', () => {
  const stories = [
    item('Banking results', ''),
    item('Road construction tender opens in KZN', ''),
    item('Markets close higher', ''),
  ];
  const { items, matchedTotal, total } = rankNewsFeed(stories, ctx);
  assert.equal(total, 3);
  assert.equal(matchedTotal, 1);
  assert.equal(items[0].title, 'Road construction tender opens in KZN');
  assert.equal(items[0].matched, true);
  assert.equal(items[0].category, 'Construction');
});

test('rankNewsFeed with no profile/preferences matches nothing', () => {
  const { matchedTotal } = rankNewsFeed([item('Construction boom', '')], { profile: null, preferences: null });
  assert.equal(matchedTotal, 0);
});

test('pickCrossLink sums the facet group and returns its busiest verbatim name', () => {
  const facets = [
    { name: 'Construction', count: 18, group: 'Construction' },
    { name: 'Civil engineering', count: 12, group: 'Construction' },
    { name: 'Plumbing', count: 30, group: 'Other service activities' },
  ];
  const link = pickCrossLink('Construction', facets);
  assert.deepEqual(link, { count: 30, linkName: 'Construction' });
  assert.equal(pickCrossLink('Other', facets), null);
  assert.equal(pickCrossLink('Cleaning', facets), null);
});
