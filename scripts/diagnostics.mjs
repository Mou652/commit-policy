import messages from './messages.cjs';

export function translateGitCheck(output) {
  return output.trimEnd().split('\n').map(line => {
    const match = line.match(/^(.*):(\d+): (.+)$/u);
    if (!match) return line;
    const reason = match[3].replace(/\.$/u, '');
    const message = messages.gitMessage(reason);
    return message ? `${match[1]}:${match[2]}: ${message}` : line;
  }).join('\n');
}
