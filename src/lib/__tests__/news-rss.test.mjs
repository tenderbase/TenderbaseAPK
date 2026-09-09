import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseFeedXml, newsItemId } from '@/lib/news-rss';

test('parses an RSS 2.0 feed with CDATA summaries', () => {
  const xml = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Test Gov News</title>
  <item>
    <title>Clean audit for KZN works</title>
    <link>https://example.gov.za/story/1</link>
    <pubDate>Tue, 08 Sep 2026 13:32:02 +0000</pubDate>
    <description><![CDATA[<p>The department achieved a <b>clean audit</b> for the first time.</p>]]></description>
  </item>
  <item>
    <title>Second headline</title>
    <link>https://example.gov.za/story/2</link>
    <pubDate>Wed, 09 Sep 2026 07:00:00 +0000</pubDate>
  </item>
</channel></rss>`;

  const feed = parseFeedXml(xml);
  assert.equal(feed.title, 'Test Gov News');
  assert.equal(feed.items.length, 2);
  const first = feed.items[0];
  assert.equal(first.title, 'Clean audit for KZN works');
  assert.equal(first.url, 'https://example.gov.za/story/1');
  assert.equal(first.publishedAt, '2026-09-08T13:32:02.000Z');
  // CDATA + tags stripped, no fabricated filler.
  assert.equal(first.dek, 'The department achieved a clean audit for the first time.');
});

test('parses an Atom feed with href links and entity decoding', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test &amp; Tech</title>
  <entry>
    <title>Markets &amp; money: R2.4bn bet</title>
    <link rel="alternate" href="https://example.tech/entry/1"/>
    <updated>2026-09-09T06:30:54Z</updated>
    <summary type="html">Billionaire&apos;s bet backfires, taking R2.4 billion with it.</summary>
  </entry>
</feed>`;

  const feed = parseFeedXml(xml);
  assert.equal(feed.title, 'Test & Tech');
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0].title, 'Markets & money: R2.4bn bet');
  assert.equal(feed.items[0].url, 'https://example.tech/entry/1');
  assert.equal(feed.items[0].publishedAt, '2026-09-09T06:30:54.000Z');
  assert.equal(feed.items[0].dek, "Billionaire's bet backfires, taking R2.4 billion with it.");
});

test('a description can never bleed into the next item', () => {
  const xml = `<rss><channel><item>
    <title>A</title><link>https://a.example</link>
    <description>Paragraph one.</description>
  </item><item>
    <title>B</title><link>https://b.example</link>
    <description>Paragraph two.</description>
  </item></channel></rss>`;
  const feed = parseFeedXml(xml);
  assert.equal(feed.items[0].dek, 'Paragraph one.');
  assert.equal(feed.items[1].dek, 'Paragraph two.');
  assert.equal(feed.items[1].title, 'B');
});

test('garbage input yields an empty feed, never a crash', () => {
  const feed = parseFeedXml('<html><body>not a feed</body></html>');
  assert.equal(feed.items.length, 0);
  assert.equal(feed.title, null);
});

test('story ids are stable hashes of the URL, namespaced by source', () => {
  const url = 'https://example.gov.za/story/1';
  const a = newsItemId('sanews', url);
  const b = newsItemId('sanews', url);
  const c = newsItemId('moneyweb', url);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(a.startsWith('sanews:'));
  assert.equal(a.length, 'sanews:'.length + 14);
});
