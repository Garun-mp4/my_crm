export type SyntheticLead = {
  id: string;
  name: string;
  city: string;
  status: string;
  score: number;
};

export type LeadListBenchmarkResult = {
  size: number;
  matched: number;
  elapsedMs: number;
};

const STATUSES = ['NEW', 'RESEARCHING', 'DRAFT_READY', 'CONTACTED', 'REPLIED'];

export const generateSyntheticLeads = (count: number): SyntheticLead[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `synthetic-${index + 1}`,
    name: `Business ${String(index + 1).padStart(6, '0')}`,
    city: index % 3 === 0 ? 'Екатеринбург' : 'Казань',
    status: STATUSES[index % STATUSES.length],
    score: (index * 17) % 101,
  }));

export const filterAndSortSyntheticLeads = (
  leads: readonly SyntheticLead[],
  query: string,
): SyntheticLead[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');

  return leads
    .filter(
      (lead) =>
        normalizedQuery.length === 0 ||
        `${lead.name} ${lead.city}`
          .toLocaleLowerCase('ru-RU')
          .includes(normalizedQuery),
    )
    .sort((left, right) => right.score - left.score);
};

export const benchmarkLeadListSizes = (
  sizes: readonly number[] = [10_000, 50_000, 100_000],
): LeadListBenchmarkResult[] =>
  sizes.map((size) => {
    const leads = generateSyntheticLeads(size);
    const startedAt = Date.now();
    const matched = filterAndSortSyntheticLeads(leads, 'Екатеринбург').length;

    return { size, matched, elapsedMs: Date.now() - startedAt };
  });
