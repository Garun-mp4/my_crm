export const MY_CRM_MCP_TOOL_NAMES = [
  'crm_list_leads',
  'crm_create_lead',
  'crm_transition_lead',
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
