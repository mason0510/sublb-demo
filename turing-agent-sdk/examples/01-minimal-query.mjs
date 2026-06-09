import { query } from 'turing-agent-sdk';
import { getTuringExecutableOption, printAssistantText } from './_shared.mjs';

await printAssistantText(query({
  prompt: '只回复 ok',
  options: {
    cwd: process.cwd(),
    maxTurns: 2,
    permissionMode: 'plan',
    allowedTools: [],
    ...getTuringExecutableOption(),
  },
}));
