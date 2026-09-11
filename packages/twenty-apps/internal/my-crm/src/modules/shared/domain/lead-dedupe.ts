export type LeadIdentity = {
  name: string;
  city?: string | null;
  websiteUrl?: string | null;
  directoryUrl?: string | null;
};

const collapseWhitespace = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

export const canonicalizeText = (value: string | null | undefined): string =>
  collapseWhitespace(value ?? '').toLocaleLowerCase('ru-RU');

const isTrackingQueryParameter = (key: string): boolean =>
  /^(utm_[a-z0-9_]+|gclid|fbclid|yclid|_openstat)$/i.test(key);

const canonicalizeUrlInternal = (
  value: string | null | undefined,
  options: { preserveQuery?: boolean } = {},
): string => {
  const normalized = collapseWhitespace(value ?? '').toLocaleLowerCase('en-US');
  if (normalized.length === 0) return '';

  try {
    const url = new URL(
      normalized.includes('://') ? normalized : `https://${normalized}`,
    );
    url.hash = '';
    url.hostname = url.hostname.replace(/^www\./, '');
    const pathname = url.pathname.replace(/\/$/, '');
    const query = options.preserveQuery
      ? new URLSearchParams(
          [...url.searchParams.entries()]
            .filter(([key]) => !isTrackingQueryParameter(key))
            .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
              `${leftKey}=${leftValue}`.localeCompare(
                `${rightKey}=${rightValue}`,
              ),
            ),
        ).toString()
      : '';

    return `${url.hostname}${pathname}${query ? `?${query}` : ''}`;
  } catch {
    return normalized
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  }
};

export const canonicalizeUrl = (value: string | null | undefined): string =>
  canonicalizeUrlInternal(value);

// Directory providers often encode the business identity in a query string
// (for example, Yandex Maps uses `oid`). Stripping every query parameter makes
// unrelated directory cards collide on the provider's shared route.
export const canonicalizeDirectoryUrl = (
  value: string | null | undefined,
): string => canonicalizeUrlInternal(value, { preserveQuery: true });

export const buildLeadDedupeKey = (identity: LeadIdentity): string => {
  const website = canonicalizeUrl(identity.websiteUrl);
  if (website.length > 0) return `website:${website}`;

  const directory = canonicalizeDirectoryUrl(identity.directoryUrl);
  if (directory.length > 0) return `directory:${directory}`;

  return `name-city:${canonicalizeText(identity.name)}:${canonicalizeText(identity.city)}`;
};
