import { describe, expect, it } from 'vitest';

import { exportLeadsToCsv } from './lead-csv-export';

describe('lead CSV export', () => {
  it('escapes commas, quotes, and line breaks without losing fields', () => {
    const csv = exportLeadsToCsv([
      {
        id: 'lead-1',
        name: 'Studio, One',
        notes: 'A "careful"\nfollow-up',
      },
    ]);

    expect(csv).toMatch(/^id,name,city,category,websiteUrl,/);
    expect(csv).toContain('lead-1,"Studio, One"');
    expect(csv).toContain('"A ""careful""\nfollow-up"');
  });
});
