import { describe, expect, it } from 'vitest';

import {
  benchmarkLeadListSizes,
  filterAndSortSyntheticLeads,
  generateSyntheticLeads,
} from './lead-list-benchmark';

describe('lead list workload', () => {
  it('keeps filtering and sorting deterministic on a large synthetic set', () => {
    const leads = generateSyntheticLeads(10_000);
    const result = filterAndSortSyntheticLeads(leads, 'Екатеринбург');

    expect(result).toHaveLength(3334);
    expect(result[0]?.score).toBeGreaterThanOrEqual(result.at(-1)?.score ?? 0);
  });

  it('runs the documented 10k/50k/100k benchmark sizes', () => {
    const results = benchmarkLeadListSizes();

    expect(results.map((result) => result.size)).toEqual([
      10_000, 50_000, 100_000,
    ]);
    expect(results.every((result) => result.matched > 0)).toBe(true);
  });
});
