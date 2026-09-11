import {
  isMyCrmMcpToolName,
  MY_CRM_MCP_TOOL_NAMES,
} from 'src/engine/api/mcp/constants/my-crm-mcp-tool-names.const';

describe('My CRM MCP tool policy', () => {
  it('keeps the public surface limited to semantic CRM tools', () => {
    expect(MY_CRM_MCP_TOOL_NAMES).toEqual([
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
    ]);
  });

  it.each([
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
  ])('allows the semantic tool %s', (toolName) => {
    expect(isMyCrmMcpToolName(toolName)).toBe(true);
  });

  it.each([
    'execute_tool',
    'get_tool_catalog',
    'create_one_leads',
    'find_many_leads',
    'execute_sql',
    'graphql',
  ])('rejects the generic or unrestricted tool %s', (toolName) => {
    expect(isMyCrmMcpToolName(toolName)).toBe(false);
  });
});
