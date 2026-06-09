import { createSdkMcpServer, query, tool } from 'turing-agent-sdk';
import { z } from 'zod';
import { getTuringExecutableOption, printAssistantText } from './_shared.mjs';

const addTool = tool(
  'add',
  '计算两个数字之和。只接受数字参数。',
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  }),
);

const utilitiesServer = createSdkMcpServer({
  name: 'utilities',
  version: '1.0.0',
  tools: [addTool],
});

await printAssistantText(query({
  prompt: '请调用 add 工具计算 12 + 30，最终只回复一个数字。',
  options: {
    cwd: process.cwd(),
    maxTurns: 4,
    permissionMode: 'default',
    mcpServers: { utilities: utilitiesServer },
    allowedTools: ['mcp__utilities__add'],
    ...getTuringExecutableOption(),
  },
}));
