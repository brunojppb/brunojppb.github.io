import { test, expect } from '@playwright/test';

test('every post responds at its original URL', async ({ request }) => {
  const slugs = [
    'https-for-your-homelab', 'distributed-lock-in-node-js', 'replace-me-at-woom',
    '1-ios-push-notifications-for-rails-developers', '7-scala-101-funcoes',
    'learnings-from-dare-to-lead', 'dev-previews', 'why-internal-platforms-fail',
  ];
  for (const slug of slugs) {
    const res = await request.get(`/entries/${slug}/`);
    expect(res.status(), `/entries/${slug}/`).toBe(200);
  }
});

test('the feed is present and lists 30 items', async ({ request }) => {
  const res = await request.get('/feed.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect((xml.match(/<item>/g) ?? []).length).toBe(30);
});
