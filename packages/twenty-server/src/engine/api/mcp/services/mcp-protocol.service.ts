import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { type ToolSet } from 'ai';
import { isDefined } from 'twenty-shared/utils';
import { type ActorMetadata, FieldActorSource } from 'twenty-shared/types';

import { JSON_RPC_ERROR_CODE } from 'src/engine/api/mcp/constants/json-rpc-error-code.const';
import { MCP_CRM_SEMANTIC_TOOL_ANNOTATIONS } from 'src/engine/api/mcp/constants/mcp-crm-semantic-tool-annotations.const';
import { MCP_CRM_SEMANTIC_READ_ONLY_TOOL_ANNOTATIONS } from 'src/engine/api/mcp/constants/mcp-crm-semantic-read-only-tool-annotations.const';
import {
  isMyCrmMcpToolName,
  MY_CRM_MCP_TOOL_NAMES,
} from 'src/engine/api/mcp/constants/my-crm-mcp-tool-names.const';
import { MCP_PROTOCOL_VERSION } from 'src/engine/api/mcp/constants/mcp-protocol-version.const';
import { MCP_SERVER_INFO } from 'src/engine/api/mcp/constants/mcp-server-info.const';
import { JsonRpc } from 'src/engine/api/mcp/dtos/json-rpc';
import { McpInstructionBuilderService } from 'src/engine/api/mcp/services/mcp-instruction-builder.service';
import { McpToolExecutorService } from 'src/engine/api/mcp/services/mcp-tool-executor.service';
import { type McpToolAnnotations } from 'src/engine/api/mcp/types/mcp-tool-annotations.type';
import { wrapJsonRpcResponse } from 'src/engine/api/mcp/utils/wrap-jsonrpc-response.util';
import { ApiKeyRoleService } from 'src/engine/core-modules/api-key/services/api-key-role.service';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { buildApiKeyAuthContext } from 'src/engine/core-modules/auth/utils/build-api-key-auth-context.util';
import { ToolRegistryService } from 'src/engine/core-modules/tool-provider/services/tool-registry.service';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';

type McpAnnotatedTool = ToolSet[string] & {
  annotations: McpToolAnnotations;
};

const annotateCrmMcpTools = (toolSet: ToolSet): ToolSet =>
  Object.fromEntries(
    Object.entries(toolSet)
      .filter(([name]) => isMyCrmMcpToolName(name))
      .map(([name, toolDefinition]) => [
        name,
        {
          ...toolDefinition,
          annotations:
            name === 'crm_list_leads'
              ? MCP_CRM_SEMANTIC_READ_ONLY_TOOL_ANNOTATIONS
              : MCP_CRM_SEMANTIC_TOOL_ANNOTATIONS,
        } as McpAnnotatedTool,
      ]),
  );

@Injectable()
export class McpProtocolService {
  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly userRoleService: UserRoleService,
    private readonly mcpToolExecutorService: McpToolExecutorService,
    private readonly apiKeyRoleService: ApiKeyRoleService,
    private readonly mcpInstructionBuilderService: McpInstructionBuilderService,
    private readonly workspaceCacheService: WorkspaceCacheService,
  ) {}

  async handleInitialize(requestId: string | number, workspaceId: string) {
    const instructions =
      await this.mcpInstructionBuilderService.buildInstructions(workspaceId);

    return wrapJsonRpcResponse(requestId, {
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: MCP_SERVER_INFO,
        instructions,
      },
    });
  }

  async getRoleId(
    workspaceId: string,
    userWorkspaceId?: string,
    apiKey?: FlatApiKey,
  ) {
    if (isDefined(apiKey)) {
      return this.apiKeyRoleService.getRoleIdForApiKeyId(
        apiKey.id,
        workspaceId,
      );
    }

    if (!userWorkspaceId) {
      throw new HttpException(
        'User workspace ID missing',
        HttpStatus.FORBIDDEN,
      );
    }

    const roleId = await this.userRoleService.getRoleIdForUserWorkspace({
      workspaceId,
      userWorkspaceId,
    });

    if (!roleId) {
      throw new HttpException('Role ID missing', HttpStatus.FORBIDDEN);
    }

    return roleId;
  }

  private async buildActorContext(
    workspaceId: string,
    userId?: string,
    apiKey?: FlatApiKey,
  ): Promise<ActorMetadata> {
    let actorContext: ActorMetadata = {
      source: FieldActorSource.AGENT,
      workspaceMemberId: null,
      name: 'Agent',
      context: {},
    };

    if (isDefined(apiKey)) {
      actorContext = {
        source: FieldActorSource.AGENT,
        workspaceMemberId: null,
        name: apiKey.name,
        context: {},
      };
    } else if (isDefined(userId)) {
      const { flatWorkspaceMemberMaps } =
        await this.workspaceCacheService.getOrRecompute(workspaceId, [
          'flatWorkspaceMemberMaps',
        ]);
      const workspaceMemberId = flatWorkspaceMemberMaps.idByUserId[userId];
      const workspaceMember = isDefined(workspaceMemberId)
        ? flatWorkspaceMemberMaps.byId[workspaceMemberId]
        : undefined;

      if (isDefined(workspaceMember)) {
        actorContext = {
          source: FieldActorSource.AGENT,
          workspaceMemberId: workspaceMember.id,
          name:
            `${workspaceMember.name?.firstName ?? ''} ${workspaceMember.name?.lastName ?? ''}`.trim() ||
            'Agent',
          context: {},
        };
      }
    }

    return actorContext;
  }

  private async buildMcpToolSet(
    workspace: FlatWorkspace,
    roleId: string,
    options?: {
      authContext?: WorkspaceAuthContext;
      userId?: string;
      userWorkspaceId?: string;
      apiKey?: FlatApiKey;
    },
  ): Promise<ToolSet> {
    const actorContext = await this.buildActorContext(
      workspace.id,
      options?.userId,
      options?.apiKey,
    );

    const toolContext = {
      workspaceId: workspace.id,
      roleId,
      authContext: options?.authContext,
      userId: options?.userId,
      userWorkspaceId: options?.userWorkspaceId,
      actorContext,
    };

    const semanticTools = await this.toolRegistry.getToolsByName(
      [...MY_CRM_MCP_TOOL_NAMES],
      toolContext,
    );

    return annotateCrmMcpTools(semanticTools);
  }

  // Returns null for JSON-RPC notifications (no id), which require no response body
  async handleMCPCoreQuery(
    { id, method, params }: JsonRpc,
    {
      workspace,
      userId,
      userWorkspaceId,
      apiKey,
    }: {
      workspace: FlatWorkspace;
      userId?: string;
      userWorkspaceId?: string;
      apiKey: FlatApiKey | undefined;
    },
    sseWriter?: (data: Record<string, unknown>) => void,
  ): Promise<Record<string, unknown> | null> {
    try {
      // JSON-RPC notifications have no id and expect no response
      if (!isDefined(id)) {
        return null;
      }

      if (method === 'initialize') {
        return this.handleInitialize(id, workspace.id);
      }

      if (method === 'ping') {
        return wrapJsonRpcResponse(id, { result: {} });
      }

      if (method === 'prompts/list') {
        return wrapJsonRpcResponse(id, {
          result: { prompts: [] },
        });
      }

      if (method === 'resources/list') {
        return wrapJsonRpcResponse(id, {
          result: { resources: [] },
        });
      }

      if (method !== 'tools/list' && method !== 'tools/call') {
        return wrapJsonRpcResponse(id, {
          error: {
            code: JSON_RPC_ERROR_CODE.METHOD_NOT_FOUND,
            message: `Method '${method}' not found`,
          },
        });
      }

      const roleId = await this.getRoleId(
        workspace.id,
        userWorkspaceId,
        apiKey,
      );

      const authContext = isDefined(apiKey)
        ? buildApiKeyAuthContext({ workspace, apiKey })
        : undefined;

      const toolSet = await this.buildMcpToolSet(workspace, roleId, {
        authContext,
        userId,
        userWorkspaceId,
        apiKey,
      });

      if (method === 'tools/call') {
        if (!params) {
          return wrapJsonRpcResponse(id, {
            error: {
              code: JSON_RPC_ERROR_CODE.INVALID_PARAMS,
              message: 'tools/call requires params with name and arguments',
            },
          });
        }

        return await this.mcpToolExecutorService.handleToolCall(
          id,
          toolSet,
          params,
          sseWriter,
        );
      }

      return this.mcpToolExecutorService.handleToolsListing(id, toolSet);
    } catch (error) {
      if (error instanceof HttpException) {
        return wrapJsonRpcResponse(id ?? 0, {
          error: {
            code: JSON_RPC_ERROR_CODE.SERVER_ERROR,
            message: error.message || 'Request failed',
          },
        });
      }

      return wrapJsonRpcResponse(id ?? 0, {
        error: {
          code: JSON_RPC_ERROR_CODE.INTERNAL_ERROR,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
      });
    }
  }
}
