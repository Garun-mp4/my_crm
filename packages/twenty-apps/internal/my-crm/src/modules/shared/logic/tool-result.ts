export type ToolFailure = {
  ok: false;
  code:
    | 'INVALID_INPUT'
    | 'DUPLICATE'
    | 'NOT_FOUND'
    | 'AUTHENTICATED_MEMBER_REQUIRED'
    | 'INVALID_STATE'
    | 'RESEARCH_FAILED'
    | 'CRM_OPERATION_FAILED';
  message: string;
  retryable?: boolean;
  correlationId?: string;
  details?: Record<string, unknown>;
};

export type ToolSuccess<T> = { ok: true } & T;

export type ToolResult<T> = ToolFailure | ToolSuccess<T>;

export const invalidInput = (message: string): ToolFailure => ({
  ok: false,
  code: 'INVALID_INPUT',
  message,
});

export const notFound = (message: string): ToolFailure => ({
  ok: false,
  code: 'NOT_FOUND',
  message,
});

export const invalidState = (message: string): ToolFailure => ({
  ok: false,
  code: 'INVALID_STATE',
  message,
});

export const researchFailed = ({
  message,
  retryable,
  correlationId,
  details,
}: {
  message: string;
  retryable: boolean;
  correlationId: string;
  details?: Record<string, unknown>;
}): ToolFailure => ({
  ok: false,
  code: 'RESEARCH_FAILED',
  message,
  retryable,
  correlationId,
  details,
});

export const operationFailure = (error: unknown): ToolFailure => {
  console.error(
    '[my-crm] operation failed',
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );

  return {
    ok: false,
    code: 'CRM_OPERATION_FAILED',
    message: 'The CRM operation could not be completed.',
  };
};
