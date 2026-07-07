import { query } from 'turing-agent-sdk';
import { getTuringExecutableOption, printAssistantText } from './_shared.mjs';

const intake = process.argv.slice(2).join(' ') || '客户说供应商拖欠货款 38 万，有合同、送货单、微信催款记录。';

await printAssistantText(query({
  prompt: `请按 legal-intake skill 整理材料，只做 intake 和律师内部备忘录，不给胜诉承诺。\n\n客户口述：${intake}`,
  options: {
    cwd: process.cwd(),
    maxTurns: 4,
    permissionMode: 'plan',
    allowedTools: [],
    settingSources: ['user', 'project'],
    skills: ['legal-intake'],
    agents: {
      'legal-intake-specialist': {
        description: '法律 intake 助手，负责事实整理、证据清单、待补材料和律师复核提醒。',
        prompt: '你是律师助理，不替代律师。只整理事实、证据、问题清单和初步备忘录，必须提示需律师复核。',
        tools: [],
      },
    },
    agent: 'legal-intake-specialist',
    ...getTuringExecutableOption(),
  },
}));
