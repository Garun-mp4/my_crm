import { describe, expect, it } from 'vitest';

import { parseLeadCsv, planLeadCsvImport } from './lead-csv-import';

describe('lead CSV import', () => {
  it('parses quoted commas and returns deterministic dedupe keys', () => {
    const result = parseLeadCsv(
      'name,city,website,rating,reviews\n"Мастеровой, Екатеринбург",Екатеринбург,https://example.ru,5,238',
    );

    expect(result.issues).toEqual([]);
    expect(result.rows[0]?.name).toBe('Мастеровой, Екатеринбург');
    expect(result.dedupeKeys).toEqual(['website:example.ru']);
  });

  it('rejects invalid values without dropping the source row', () => {
    const result = parseLeadCsv('name,rating,reviews\nExample,6,-1');

    expect(result.rows).toHaveLength(1);
    expect(result.issues).toEqual([
      { row: 2, field: 'rating', message: 'Rating must be between 0 and 5' },
      {
        row: 2,
        field: 'reviewCount',
        message: 'Review count cannot be negative',
      },
    ]);
  });

  it('plans duplicates and preserves rows that need correction', () => {
    const plan = planLeadCsvImport(
      'name,website\nFirst,https://example.ru\nSecond,https://example.ru\n,https://missing-name.ru',
      { existingDedupeKeys: new Set(['website:existing.ru']) },
    );

    expect(plan.acceptedRows).toHaveLength(1);
    expect(plan.duplicateRows).toEqual([3]);
    expect(plan.rejectedRows.map((row) => row.rowNumber)).toEqual([3, 4]);
    expect(plan.issues).toContainEqual({
      row: 4,
      field: 'name',
      message: 'Company name is required',
    });
  });
});
