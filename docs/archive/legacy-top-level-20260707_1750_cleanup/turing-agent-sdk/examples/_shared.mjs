export function getTuringExecutableOption() {
  const value = process.env.TURING_BINARY_PATH?.trim();
  return value ? { pathToTuringExecutable: value } : {};
}

export function extractAssistantText(message) {
  if (message?.type !== 'assistant') return '';
  const blocks = message.message?.content || [];
  return blocks
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('');
}

export async function printAssistantText(stream) {
  let text = '';
  for await (const message of stream) {
    const chunk = extractAssistantText(message);
    if (chunk) {
      text += chunk;
      process.stdout.write(chunk);
    }
    if (message?.type === 'result' && message.subtype && message.subtype !== 'success') {
      console.error(`\n[result] ${message.subtype}`);
    }
  }
  if (!text.endsWith('\n')) process.stdout.write('\n');
  return text;
}
