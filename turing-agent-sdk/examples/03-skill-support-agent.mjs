import { query } from 'turing-agent-sdk';
import { getTuringExecutableOption, printAssistantText } from './_shared.mjs';

const ticket = process.argv.slice(2).join(' ') || '用户说 turingdeepseek 返回 405，问是不是 key 坏了。';

await printAssistantText(query({
  prompt: `请按 customer-support skill 处理这个工单，输出：问题分类、需要核验的字段、给用户的简短回复。\n\n工单：${ticket}`,
  options: {
    cwd: process.cwd(),
    maxTurns: 4,
    permissionMode: 'plan',
    allowedTools: [],
    settingSources: ['user', 'project'],
    skills: ['customer-support'],
    agents: {
      'support-specialist': {
        description: 'Turing / SubLB 客服分诊专家，擅长 405、502、503、key 与 base URL 排障。',
        prompt: '你是客服分诊专家。先判断问题类型，再给出可执行、可复制、不过度暴露内部实现的回复。',
        tools: [],
      },
    },
    agent: 'support-specialist',
    ...getTuringExecutableOption(),
  },
}));
