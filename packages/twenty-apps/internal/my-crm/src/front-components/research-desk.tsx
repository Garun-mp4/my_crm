import { useEffect, useState, type CSSProperties } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { defineFrontComponent } from 'twenty-sdk/define';

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
  total: number;
  researching: number;
  ready: number;
  needsAttention: number;
};

type LoadingState =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      rows: LeadRow[];
      nextCursor: string | null;
      loadingMore: boolean;
      summary: LeadSummary;
      loadMoreError?: string;
    }
  | { kind: 'error'; message: string };

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
  typeof value === 'object' && value !== null;

const readString = (value: unknown, key: string): string => {
  if (!isRecord(value)) return '';
  const result = value[key];
  return typeof result === 'string' ? result : '';
};

const loadLeads = async (after?: string): Promise<LeadPage> => {
  const response: unknown = await new CoreApiClient().query({
    leads: {
      __args: { first: 25, ...(after ? { after } : {}) },
      edges: { node: { id: true, name: true, status: true, priority: true } },
      pageInfo: { hasNextPage: true, endCursor: true },
    },
  });
  if (!isRecord(response) || !isRecord(response.leads)) {
    return { rows: [], nextCursor: null };
  }
  const edges = response.leads.edges;
  if (!Array.isArray(edges)) return { rows: [], nextCursor: null };

  const rows = edges.flatMap((edge) => {
    if (!isRecord(edge) || !isRecord(edge.node)) return [];
    const id = readString(edge.node, 'id');
    const name = readString(edge.node, 'name');
    if (!id || !name) return [];
    return [
      {
        id,
        name,
        status: readString(edge.node, 'status'),
        priority: readString(edge.node, 'priority'),
      },
    ];
  });

  const pageInfo = isRecord(response.leads.pageInfo)
    ? response.leads.pageInfo
    : null;
  const hasNextPage =
    pageInfo && typeof pageInfo.hasNextPage === 'boolean'
      ? pageInfo.hasNextPage
      : false;
  const nextCursor =
    hasNextPage && typeof pageInfo?.endCursor === 'string'
      ? pageInfo.endCursor
      : null;

  return { rows, nextCursor };
};

const countLeads = async (
  filter?: Record<string, unknown>,
): Promise<number> => {
  const response: unknown = await new CoreApiClient().query({
    leads: {
      __args: {
        first: 1,
        ...(filter ? { filter } : {}),
      },
      edges: { node: { id: true } },
      totalCount: true,
    },
  });

  if (!isRecord(response) || !isRecord(response.leads)) {
    throw new Error('Lead count response is invalid.');
  }

  const totalCount = response.leads.totalCount;
  if (typeof totalCount !== 'number') {
    throw new Error('Lead count was not returned by the server.');
  }

  return totalCount;
};

const loadSummary = async (): Promise<LeadSummary> => {
  const [total, researching, ready, needsAttention] = await Promise.all([
    countLeads(),
    countLeads({ status: { eq: 'RESEARCHING' } }),
    countLeads({ status: { eq: 'DRAFT_READY' } }),
    countLeads({ priority: { in: ['HIGH', 'URGENT'] } }),
  ]);

  return { total, researching, ready, needsAttention };
};

const statusLabel = (status: string): string =>
  status.toLocaleLowerCase('en-US').replaceAll('_', ' ');

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
  const [state, setState] = useState<LoadingState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadLeads(), loadSummary()])
      .then(([page, summary]) => {
        if (!cancelled)
          setState({
            kind: 'ready',
            rows: page.rows,
            nextCursor: page.nextCursor,
            loadingMore: false,
            summary,
          });
      })
      .catch(() => {
        if (!cancelled)
          setState({
            kind: 'error',
            message:
              'Не удалось загрузить лиды. Проверьте доступ к рабочему пространству.',
          });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadNextPage = async () => {
    if (state.kind !== 'ready' || !state.nextCursor || state.loadingMore)
      return;

    setState({ ...state, loadingMore: true, loadMoreError: undefined });
    try {
      const page = await loadLeads(state.nextCursor);
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
              loadMoreError: 'Не удалось загрузить следующую страницу.',
            }
          : current,
      );
    }
  };

  const summary: LeadSummary =
    state.kind === 'ready'
      ? state.summary
      : { total: 0, researching: 0, ready: 0, needsAttention: 0 };

  return (
    <main style={styles.root} aria-labelledby="research-desk-title">
      <header style={styles.header}>
        <p style={styles.eyebrow}>My CRM / lead research</p>
        <h1 id="research-desk-title" style={styles.title}>
          Research desk
        </h1>
        <p style={styles.lede}>
          A quiet workspace for turning public business evidence into a short,
          reviewable path to a thoughtful first message.
        </p>
      </header>

      <section style={styles.grid} aria-label="Lead summary">
        {[
          ['All leads', summary.total, colors.surface],
          ['In research', summary.researching, colors.lavender],
          ['Draft ready', summary.ready, colors.mint],
          ['Needs attention', summary.needsAttention, colors.peach],
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
            Recent lead desk
          </h2>
          <p style={styles.panelMeta}>25 records per page · server cursor</p>
        </header>

        {state.kind === 'loading' && (
          <p style={styles.empty} role="status">
            Loading the lead queue…
          </p>
        )}
        {state.kind === 'error' && (
          <p style={styles.error} role="alert">
            {state.message}
          </p>
        )}
        {state.kind === 'ready' && state.rows.length === 0 && (
          <p style={styles.empty}>
            No leads yet. Start with a directory card and preserve the evidence
            that led to the lead.
          </p>
        )}
        {state.kind === 'ready' && state.rows.length > 0 && (
          <div style={styles.list} role="table" aria-label="Recent leads">
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
                  {statusLabel(row.status || 'NEW')}
                </span>
                <span
                  style={{ ...styles.panelMeta, textTransform: 'capitalize' }}
                  role="cell"
                >
                  {statusLabel(row.priority || 'NORMAL')}
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
                  {state.loadingMore ? 'Loading…' : 'Load next page'}
                </button>
              )}
            </div>
          )}
      </section>

      <p style={styles.footer}>
        Evidence remains separate from generated copy. Drafts can be prepared by
        tools, but only a workspace member can approve an outreach draft, and
        this dashboard never sends one.
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
