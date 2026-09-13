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

  it('normalizes percent-escape casing across equivalent URL inputs', () => {
    const encoded = 'https://example.com/%d0%bc%d0%b0%d0%b3%d0%b0%d0%b7%d0%b8%d0%bd';
    const unicode = 'https://example.com/магазин';

    expect(canonicalizeUrl(encoded)).toBe(canonicalizeUrl(unicode));
    expect(canonicalizeUrl(encoded)).toBe(
      'example.com/%D0%BC%D0%B0%D0%B3%D0%B0%D0%B7%D0%B8%D0%BD',
    );
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
