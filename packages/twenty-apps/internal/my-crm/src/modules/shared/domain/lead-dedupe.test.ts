import { describe, expect, it } from 'vitest';

import {
  buildLeadDedupeKey,
  canonicalizeDirectoryUrl,
  canonicalizeUrl,
} from './lead-dedupe';

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

  it('preserves directory identity query parameters while dropping tracking', () => {
    expect(
      canonicalizeDirectoryUrl(
        'https://yandex.ru/maps/?oid=217699689851&utm_source=campaign',
      ),
    ).toBe('yandex.ru/maps?oid=217699689851');
    expect(
      buildLeadDedupeKey({
        name: 'One business',
        directoryUrl: 'https://yandex.ru/maps/?ol=biz&oid=1',
      }),
    ).not.toBe(
      buildLeadDedupeKey({
        name: 'Another business',
        directoryUrl: 'https://yandex.ru/maps/?ol=biz&oid=2',
      }),
    );
  });
});
