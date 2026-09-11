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

export const canonicalizeUrl = (value: string | null | undefined): string => {
  const normalized = collapseWhitespace(value ?? '').toLocaleLowerCase('en-US');
  if (normalized.length === 0) return '';

  try {
    const url = new URL(
      normalized.includes('://') ? normalized : `https://${normalized}`,
    );
    url.hash = '';
    url.search = '';
    url.hostname = url.hostname.replace(/^www\./, '');
    return `${url.hostname}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return normalized
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  }
};

export const buildLeadDedupeKey = (identity: LeadIdentity): string => {
  const website = canonicalizeUrl(identity.websiteUrl);
  if (website.length > 0) return `website:${website}`;

  const directory = canonicalizeUrl(identity.directoryUrl);
  if (directory.length > 0) return `directory:${directory}`;

  return `name-city:${canonicalizeText(identity.name)}:${canonicalizeText(identity.city)}`;
};
