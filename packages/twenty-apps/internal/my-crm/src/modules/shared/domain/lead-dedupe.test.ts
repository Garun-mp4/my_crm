import { describe, expect, it } from 'vitest';

import { buildLeadDedupeKey, canonicalizeUrl } from './lead-dedupe';

describe('lead deduplication', () => {
  it('canonicalizes website identity before creating a key', () => {
    expect(canonicalizeUrl('https://www.Example.ru/catalog/?utm=1#home')).toBe(
      'example.ru/catalog',
    );
    expect(
      buildLeadDedupeKey({
        name: 'Example',
        websiteUrl: 'https://www.example.ru/',
      }),
    ).toBe('website:example.ru');
  });

  it('falls back to company and city when there is no URL', () => {
    expect(
      buildLeadDedupeKey({ name: '  Мастеровой  ', city: ' Екатеринбург ' }),
    ).toBe('name-city:мастеровой:екатеринбург');
  });
});
