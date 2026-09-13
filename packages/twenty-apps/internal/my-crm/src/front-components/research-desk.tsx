import { useEffect, useState, type CSSProperties } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useTranslate } from 'twenty-sdk/front-component';

export const RESEARCH_DESK_FRONT_COMPONENT_ID =
  '4ab5ef26-0637-4845-b123-223344556678';

type LeadRow = {
  id: string;
  name: string;
  status: string;
  priority: string;
};

type LeadPage = {
  rows: LeadRow[];
  nextCursor: string | null;
};

type LeadSummary = {
  total: number | null;
  researching: number | null;
  ready: number | null;
  needsAttention: number | null;
};

type LoadingState =
  | { kind: 'loading'; summary: LeadSummary }
  | {
      kind: 'ready';
      rows: LeadRow[];
      nextCursor: string | null;
      loadingMore: boolean;
      summary: LeadSummary;
      loadMoreError?: string;
    }
  | { kind: 'error'; message: string };

const EMPTY_SUMMARY: LeadSummary = {
  total: null,
  researching: null,
  ready: null,
  needsAttention: null,
};

const colors = {
  canvas: '#f5f5f5',
  ink: '#0c0a09',
  body: '#4e4e4e',
  muted: '#777169',
  line: '#e7e5e4',
  surface: '#ffffff',
  lavender: '#e7e1ff',
  mint: '#dff5e8',
  peach: '#ffe9dc',
  rose: '#ffe0e4',
} as const;

const font = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const displayFont = 'Georgia, "Times New Roman", serif';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown, key: string): string => {
  if (!isRecord(value) || !Object.hasOwn(value, key)) {
    throw new Error('Lead list response is invalid.');
  }

  const result = value[key];
  if (result === null) return '';
  if (typeof result !== 'string') {
    throw new Error('Lead list response is invalid.');
  }

  return result;
};

const loadLeads = async (
  client: CoreApiClient,
  after?: string,
): Promise<LeadPage> => {
  const response: unknown = await client.query({
    leads: {
      __args: {
        first: 25,
        orderBy: [{ createdAt: 'DescNullsLast' }],
        ...(after ? { after } : {}),
      },
      edges: { node: { id: true, name: true, status: true, priority: true } },
      pageInfo: { hasNextPage: true, endCursor: true },
    },
  });
  if (!isRecord(response) || !isRecord(response.leads)) {
    throw new Error('Lead list response is invalid.');
  }
  const edges = response.leads.edges;
  if (!Array.isArray(edges)) throw new Error('Lead list response is invalid.');

  const rows = edges.map((edge) => {
    if (!isRecord(edge) || !isRecord(edge.node)) {
      throw new Error('Lead list response is invalid.');
    }

    const id = readString(edge.node, 'id');
    const name = readString(edge.node, 'name');
    if (!id || !name) throw new Error('Lead list response is invalid.');

    return {
      id,
      name,
      status: readString(edge.node, 'status'),
      priority: readString(edge.node, 'priority'),
    };
  });

  const pageInfo = response.leads.pageInfo;
  if (!isRecord(pageInfo)) {
    throw new Error('Lead list response is invalid.');
  }

  const hasNextPage = pageInfo.hasNextPage;
  const endCursor = pageInfo.endCursor;
  if (
    typeof hasNextPage !== 'boolean' ||
    (typeof endCursor !== 'string' && endCursor !== null)
  ) {
    throw new Error('Lead list response is invalid.');
  }

  if (hasNextPage && (!endCursor || endCursor === after)) {
    throw new Error('Lead list response is invalid.');
  }

  return { rows, nextCursor: hasNextPage ? endCursor : null };
};

const countLeads = async (
  client: CoreApiClient,
  filter?: Record<string, unknown>,
): Promise<number> => {
  const response: unknown = await client.query({
    leads: {
      __args: { first: 1, ...(filter ? { filter } : {}) },
      totalCount: true,
    },
  });

  if (!isRecord(response) || !isRecord(response.leads)) {
    throw new Error('Lead count response is invalid.');
  }

  const totalCount = response.leads.totalCount;
  if (
    typeof totalCount !== 'number' ||
    !Number.isInteger(totalCount) ||
    totalCount < 0
  ) {
    throw new Error('Lead count response is invalid.');
  }

  return totalCount;
};

const loadSummary = async (client: CoreApiClient): Promise<LeadSummary> => {
  const results = await Promise.allSettled([
    countLeads(client),
    countLeads(client, { status: { eq: 'RESEARCHING' } }),
    countLeads(client, { status: { eq: 'DRAFT_READY' } }),
    countLeads(client, { priority: { in: ['HIGH', 'URGENT'] } }),
  ]);

  const readCount = (result: PromiseSettledResult<number>): number | null =>
    result.status === 'fulfilled' ? result.value : null;

  return {
    total: readCount(results[0]),
    researching: readCount(results[1]),
    ready: readCount(results[2]),
    needsAttention: readCount(results[3]),
  };
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  RESEARCHING: 'Researching',
  RESEARCHED: 'Researched',
  QUALIFIED: 'Qualified',
  DRAFT_READY: 'Draft ready',
  CONTACTED: 'Contacted',
  REPLIED: 'Replied',
  MEETING: 'Meeting',
  WON: 'Won',
  LOST: 'Lost',
  DUPLICATE: 'Duplicate',
  DO_NOT_CONTACT: 'Do not contact',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const statusLabel = (status: string, t: (message: string) => string): string =>
  t(
    STATUS_LABELS[status] ??
      status.toLocaleLowerCase('en-US').replaceAll('_', ' '),
  );

const statusColor = (status: string): string => {
  if (
    status === 'RESEARCHED' ||
    status === 'QUALIFIED' ||
    status === 'DRAFT_READY' ||
    status === 'REPLIED'
  )
    return colors.mint;
  if (status === 'RESEARCHING') return colors.lavender;
  if (status === 'CONTACTED') return colors.peach;
  if (status === 'DO_NOT_CONTACT' || status === 'LOST') return colors.rose;
  return '#eeeae7';
};

const styles: Record<string, CSSProperties> = {
  root: {
    boxSizing: 'border-box',
    minHeight: '100%',
    padding: '32px clamp(20px, 4vw, 72px) 48px',
    background: colors.canvas,
    color: colors.ink,
    fontFamily: font,
  },
  header: { maxWidth: 1180, margin: '0 auto 28px' },
  eyebrow: {
    margin: 0,
    color: colors.muted,
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  title: {
    margin: '8px 0 10px',
    fontFamily: displayFont,
    fontSize: 'clamp(34px, 5vw, 64px)',
    fontWeight: 400,
    letterSpacing: '-0.035em',
    lineHeight: 0.98,
  },
  lede: {
    maxWidth: 560,
    margin: 0,
    color: colors.body,
    fontSize: 15,
    lineHeight: 1.6,
  },
  grid: {
    maxWidth: 1180,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
  },
  card: {
    minHeight: 104,
    padding: 18,
    border: `1px solid ${colors.line}`,
    background: colors.surface,
  },
  cardLabel: { margin: 0, color: colors.muted, fontSize: 12 },
  cardValue: {
    margin: '18px 0 0',
    fontSize: 32,
    fontWeight: 500,
    letterSpacing: '-0.04em',
  },
  panel: {
    maxWidth: 1180,
    margin: '28px auto 0',
    border: `1px solid ${colors.line}`,
    background: colors.surface,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    alignItems: 'baseline',
    flexWrap: 'wrap',
    padding: '18px 20px',
    borderBottom: `1px solid ${colors.line}`,
  },
  panelTitle: {
    margin: 0,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: 400,
  },
  panelMeta: { margin: 0, color: colors.muted, fontSize: 12 },
  list: { display: 'grid' },
  row: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(0, 1fr) minmax(90px, 150px) minmax(80px, 120px)',
    gap: 16,
    alignItems: 'center',
    minHeight: 62,
    padding: '0 20px',
    borderBottom: `1px solid ${colors.line}`,
  },
  rowName: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 14,
    fontWeight: 550,
  },
  pill: {
    justifySelf: 'start',
    padding: '5px 8px',
    borderRadius: 999,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  empty: {
    padding: '40px 20px',
    color: colors.muted,
    fontSize: 14,
    lineHeight: 1.6,
  },
  error: {
    padding: '40px 20px',
    color: '#9f1239',
    fontSize: 14,
    lineHeight: 1.6,
  },
  footer: {
    maxWidth: 1180,
    margin: '28px auto 0',
    color: colors.muted,
    fontSize: 12,
    lineHeight: 1.6,
  },
  loadMore: {
    margin: 0,
    padding: '16px 20px',
    borderTop: `1px solid ${colors.line}`,
    color: colors.body,
    fontSize: 13,
  },
  loadMoreButton: {
    minHeight: 44,
    padding: '0 14px',
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    background: colors.surface,
    color: colors.ink,
    font: 'inherit',
    cursor: 'pointer',
  },
};

const ResearchDesk = () => {
  const { t } = useTranslate();
  const [client] = useState(() => new CoreApiClient());
  const [state, setState] = useState<LoadingState>({
    kind: 'loading',
    summary: EMPTY_SUMMARY,
  });

  useEffect(() => {
    let cancelled = false;
    void loadLeads(client)
      .then((page) => {
        if (!cancelled)
          setState((current) => ({
            kind: 'ready',
            rows: page.rows,
            nextCursor: page.nextCursor,
            loadingMore: false,
            summary:
              current.kind === 'loading' ? current.summary : EMPTY_SUMMARY,
          }));
      })
      .catch(() => {
        if (!cancelled)
          setState({
            kind: 'error',
            message: 'Unable to load leads. Check access to the current workspace.',
          });
      });

    void loadSummary(client).then((summary) => {
      if (!cancelled)
        setState((current) => {
          if (current.kind === 'loading' || current.kind === 'ready') {
            return { ...current, summary };
          }

          return current;
        });
    });

    return () => {
      cancelled = true;
    };
  }, [client]);

  const loadNextPage = async () => {
    if (state.kind !== 'ready' || !state.nextCursor || state.loadingMore)
      return;

    setState({ ...state, loadingMore: true, loadMoreError: undefined });
    try {
      const page = await loadLeads(client, state.nextCursor);
      setState((current) =>
        current.kind === 'ready'
          ? {
              ...current,
              rows: [...current.rows, ...page.rows],
              nextCursor: page.nextCursor,
              loadingMore: false,
            }
          : current,
      );
    } catch {
      setState((current) =>
        current.kind === 'ready'
          ? {
              ...current,
              loadingMore: false,
              loadMoreError: t('Unable to load the next page.'),
            }
          : current,
      );
    }
  };

  const summary: LeadSummary =
    state.kind === 'loading' || state.kind === 'ready'
      ? state.summary
      : EMPTY_SUMMARY;

  return (
    <main style={styles.root} aria-labelledby="research-desk-title">
      <header style={styles.header}>
        <p style={styles.eyebrow}>{t('GarunCRM / lead research')}</p>
        <h1 id="research-desk-title" style={styles.title}>
          {t('Research desk')}
        </h1>
        <p style={styles.lede}>
          {t(
            'A quiet workspace for turning public business evidence into a short, reviewable path to a thoughtful first message.',
          )}
        </p>
      </header>

      <section style={styles.grid} aria-label={t('Lead summary')}>
        {[
          [t('All leads'), summary.total ?? '—', colors.surface],
          [t('In research'), summary.researching ?? '—', colors.lavender],
          [t('Draft ready'), summary.ready ?? '—', colors.mint],
          [t('Needs attention'), summary.needsAttention ?? '—', colors.peach],
        ].map(([label, value, background]) => (
          <article
            key={String(label)}
            style={{ ...styles.card, background: String(background) }}
          >
            <p style={styles.cardLabel}>{label}</p>
            <p style={styles.cardValue}>{value}</p>
          </article>
        ))}
      </section>

      <section style={styles.panel} aria-labelledby="recent-leads-title">
        <header style={styles.panelHeader}>
          <h2 id="recent-leads-title" style={styles.panelTitle}>
            {t('Recent lead desk')}
          </h2>
          <p style={styles.panelMeta}>
            {t('25 records per page · server cursor')}
          </p>
        </header>

        {state.kind === 'loading' && (
          <p style={styles.empty} role="status">
            {t('Loading the lead queue…')}
          </p>
        )}
        {state.kind === 'error' && (
          <p style={styles.error} role="alert">
            {state.message}
          </p>
        )}
        {state.kind === 'ready' && state.rows.length === 0 && (
          <p style={styles.empty}>
            {t(
              'No leads yet. Start with a directory card and preserve the evidence that led to the lead.',
            )}
          </p>
        )}
        {state.kind === 'ready' && state.rows.length > 0 && (
          <div style={styles.list} role="table" aria-label={t('Recent leads')}>
            {state.rows.map((row) => (
              <div key={row.id} style={styles.row} role="row">
                <span style={styles.rowName} role="cell">
                  {row.name}
                </span>
                <span
                  style={{
                    ...styles.pill,
                    background: statusColor(row.status),
                  }}
                  role="cell"
                >
                  {statusLabel(row.status || 'NEW', t)}
                </span>
                <span
                  style={{ ...styles.panelMeta, textTransform: 'capitalize' }}
                  role="cell"
                >
                  {statusLabel(row.priority || 'NORMAL', t)}
                </span>
              </div>
            ))}
          </div>
        )}
        {state.kind === 'ready' &&
          (state.nextCursor || state.loadMoreError) && (
            <div style={styles.loadMore}>
              {state.loadMoreError && (
                <p role="alert" style={styles.error}>
                  {state.loadMoreError}
                </p>
              )}
              {state.nextCursor && (
                <button
                  type="button"
                  style={styles.loadMoreButton}
                  onClick={() => void loadNextPage()}
                  disabled={state.loadingMore}
                >
                  {state.loadingMore ? t('Loading…') : t('Load next page')}
                </button>
              )}
            </div>
          )}
      </section>

      <p style={styles.footer}>
        {t(
          'Evidence remains separate from generated copy. Drafts can be prepared by tools, but only a workspace member can approve an outreach draft, and this dashboard never sends one.',
        )}
      </p>
    </main>
  );
};

export default defineFrontComponent({
  universalIdentifier: RESEARCH_DESK_FRONT_COMPONENT_ID,
  name: 'Research desk',
  description:
    'Lead research summary with safe empty, loading, and error states.',
  component: ResearchDesk,
});
