import { Injectable } from '@nestjs/common';

import { buildMcpServerInstructions } from 'src/engine/api/mcp/utils/build-mcp-server-instructions.util';

@Injectable()
export class McpInstructionBuilderService {
  async buildInstructions(_workspaceId: string): Promise<string> {
    return buildMcpServerInstructions();
  }
}
