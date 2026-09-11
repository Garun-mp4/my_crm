export type ResearchSourceValidation =
  | { valid: true; normalizedUrl: string | null }
  | {
      valid: false;
      reason: 'INVALID_URL' | 'UNSUPPORTED_PROTOCOL' | 'PRIVATE_HOST';
    };

const isPrivateIpv4 = (hostname: string): boolean => {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
};

export const validateResearchSource = (
  sourceUrl: string | null | undefined,
): ResearchSourceValidation => {
  if (!sourceUrl?.trim()) return { valid: true, normalizedUrl: null };

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl.trim());
  } catch {
    return { valid: false, reason: 'INVALID_URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'UNSUPPORTED_PROTOCOL' };
  }

  const hostname = parsed.hostname.toLocaleLowerCase('en-US');
  if (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    isPrivateIpv4(hostname)
  ) {
    return { valid: false, reason: 'PRIVATE_HOST' };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
};
