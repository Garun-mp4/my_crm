import { z } from 'zod';

import { LEAD_LIFECYCLE_STATES } from '../domain/lead-lifecycle';

export const listLeadsSchema = z.object({
  query: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  status: z.enum(LEAD_LIFECYCLE_STATES).optional(),
  first: z.number().int().min(1).max(50).default(25),
  after: z.string().trim().min(1).optional(),
});

export const transitionLeadSchema = z.object({
  leadId: z.string().uuid(),
  to: z.enum(LEAD_LIFECYCLE_STATES),
  idempotencyKey: z.string().trim().min(1).optional(),
});

const csvPayload = z.string().trim().min(1).max(5_000_000);

export const previewLeadImportSchema = z.object({
  csv: csvPayload,
});

export const commitLeadImportSchema = z.object({
  csv: csvPayload,
  fileName: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(1).max(200),
  confirm: z.literal(true),
});

export const syncLeadTrackerSchema = commitLeadImportSchema;

export const rollbackLeadImportSchema = z.object({
  batchId: z.string().uuid(),
  confirm: z.literal(true),
});

export const createLeadSchema = z.object({
  name: z.string().trim().min(1),
  city: z.string().trim().optional(),
  category: z.string().trim().optional(),
  websiteUrl: z.string().url().optional(),
  directoryUrl: z.string().url().optional(),
  source: z
    .enum(['YANDEX_MAPS', 'IMPORT', 'REFERRAL', 'MANUAL', 'OTHER'])
    .default('MANUAL'),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  idempotencyKey: z.string().trim().min(1).optional(),
});

export const recordResearchSchema = z.object({
  leadId: z.string().uuid(),
  name: z.string().trim().min(1),
  kind: z
    .enum([
      'DIRECTORY',
      'REVIEW',
      'WEBSITE',
      'SCREENSHOT',
      'SOURCE_CODE',
      'OTHER',
    ])
    .default('WEBSITE'),
  fact: z.string().trim().min(1),
  sourceUrl: z.string().url().optional(),
  sourceTitle: z.string().trim().optional(),
  observedAt: z.string().datetime().optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  provenance: z
    .enum(['HUMAN', 'AI_DRAFT', 'IMPORTED', 'SYSTEM'])
    .default('HUMAN'),
  evidenceHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().trim().min(1).optional(),
});

export const startResearchSchema = z.object({
  leadId: z.string().uuid(),
  sourceUrl: z.string().url(),
  sourceTitle: z.string().trim().max(200).optional(),
  observation: z.string().trim().max(20_000).optional(),
  provider: z.literal('LOCAL_FIXTURE').default('LOCAL_FIXTURE'),
  failureMode: z.enum(['NONE', 'TRANSIENT', 'PERMANENT']).default('NONE'),
  maxAttempts: z.number().int().min(1).max(5).default(3),
  idempotencyKey: z.string().trim().min(1).max(200),
});

export const runResearchJobSchema = z.object({
  jobId: z.string().uuid(),
});

export const retryResearchJobSchema = z.object({
  jobId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
});

export const getResearchJobSchema = z.object({
  jobId: z.string().uuid(),
});

export const createOutreachDraftSchema = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(['EMAIL', 'TELEGRAM', 'WHATSAPP', 'VK', 'OTHER']),
  subject: z.string().trim().optional(),
  body: z.string().trim().min(1),
  sourceFacts: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1),
});

export const approveOutreachDraftSchema = z.object({
  draftId: z.string().uuid(),
  approvalNote: z.string().trim().optional(),
});

export const logActivitySchema = z.object({
  leadId: z.string().uuid(),
  name: z.string().trim().min(1),
  type: z.enum([
    'RESEARCH_CAPTURED',
    'DRAFT_CREATED',
    'DRAFT_APPROVED',
    'MESSAGE_SENT',
    'REPLY_RECEIVED',
    'STATUS_CHANGED',
    'NOTE',
  ]),
  body: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1),
});

export type CreateLeadPayload = z.infer<typeof createLeadSchema>;
export type ListLeadsPayload = z.infer<typeof listLeadsSchema>;
export type TransitionLeadPayload = z.infer<typeof transitionLeadSchema>;
export type PreviewLeadImportPayload = z.infer<typeof previewLeadImportSchema>;
export type CommitLeadImportPayload = z.infer<typeof commitLeadImportSchema>;
export type SyncLeadTrackerPayload = z.infer<typeof syncLeadTrackerSchema>;
export type RollbackLeadImportPayload = z.infer<
  typeof rollbackLeadImportSchema
>;
export type RecordResearchPayload = z.infer<typeof recordResearchSchema>;
export type StartResearchPayload = z.infer<typeof startResearchSchema>;
export type RunResearchJobPayload = z.infer<typeof runResearchJobSchema>;
export type RetryResearchJobPayload = z.infer<typeof retryResearchJobSchema>;
export type GetResearchJobPayload = z.infer<typeof getResearchJobSchema>;
export type CreateOutreachDraftPayload = z.infer<
  typeof createOutreachDraftSchema
>;
export type ApproveOutreachDraftPayload = z.infer<
  typeof approveOutreachDraftSchema
>;
export type LogActivityPayload = z.infer<typeof logActivitySchema>;
