export const MY_CRM_APPLICATION_UNIVERSAL_IDENTIFIER =
  '5c2d8b32-99bf-4af7-9e0d-2f7cb1d0f7f1';

export const MY_CRM_MCP_TOOL_NAMES = [
  'crm_list_leads',
  'crm_create_lead',
  'crm_transition_lead',
  'crm_start_research',
  'crm_run_research_job',
  'crm_retry_research_job',
  'crm_get_research_job',
  'crm_preview_lead_import',
  'crm_import_leads',
  'crm_rollback_import',
  'crm_record_research',
  'crm_create_outreach_draft',
  'crm_approve_outreach_draft',
  'crm_log_activity',
] as const;

export type MyCrmMcpToolName = (typeof MY_CRM_MCP_TOOL_NAMES)[number];

export const isMyCrmMcpToolName = (
  toolName: string,
): toolName is MyCrmMcpToolName =>
  (MY_CRM_MCP_TOOL_NAMES as readonly string[]).includes(toolName);
