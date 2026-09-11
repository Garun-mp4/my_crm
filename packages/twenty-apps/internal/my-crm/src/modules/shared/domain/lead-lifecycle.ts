export const LEAD_LIFECYCLE_STATES = [
  'NEW',
  'RESEARCHING',
  'RESEARCHED',
  'QUALIFIED',
  'DRAFT_READY',
  'CONTACTED',
  'REPLIED',
  'MEETING',
  'WON',
  'LOST',
  'DUPLICATE',
  'DO_NOT_CONTACT',
] as const;

export type LeadLifecycleState = (typeof LEAD_LIFECYCLE_STATES)[number];

const transitions: Readonly<
  Record<LeadLifecycleState, readonly LeadLifecycleState[]>
> = {
  NEW: ['RESEARCHING', 'DUPLICATE', 'DO_NOT_CONTACT'],
  RESEARCHING: ['RESEARCHED', 'NEW', 'DUPLICATE', 'DO_NOT_CONTACT'],
  RESEARCHED: [
    'QUALIFIED',
    'DRAFT_READY',
    'RESEARCHING',
    'DUPLICATE',
    'DO_NOT_CONTACT',
  ],
  QUALIFIED: ['DRAFT_READY', 'CONTACTED', 'RESEARCHED', 'DO_NOT_CONTACT'],
  DRAFT_READY: ['CONTACTED', 'QUALIFIED', 'DO_NOT_CONTACT'],
  CONTACTED: ['REPLIED', 'LOST', 'DRAFT_READY', 'DO_NOT_CONTACT'],
  REPLIED: ['MEETING', 'WON', 'LOST', 'CONTACTED', 'DO_NOT_CONTACT'],
  MEETING: ['WON', 'LOST', 'REPLIED', 'DO_NOT_CONTACT'],
  WON: [],
  LOST: ['QUALIFIED', 'DRAFT_READY', 'DO_NOT_CONTACT'],
  DUPLICATE: [],
  DO_NOT_CONTACT: [],
};

export class InvalidLeadTransitionError extends Error {
  constructor(from: LeadLifecycleState, to: LeadLifecycleState) {
    super(`Lead transition ${from} -> ${to} is not allowed`);
    this.name = 'InvalidLeadTransitionError';
  }
}

export const canTransitionLead = (
  from: LeadLifecycleState,
  to: LeadLifecycleState,
): boolean => transitions[from].includes(to);

export const assertLeadTransition = (
  from: LeadLifecycleState,
  to: LeadLifecycleState,
): LeadLifecycleState => {
  if (!canTransitionLead(from, to)) {
    throw new InvalidLeadTransitionError(from, to);
  }

  return to;
};

export const getAllowedLeadTransitions = (
  from: LeadLifecycleState,
): readonly LeadLifecycleState[] => transitions[from];
