const whitespaceMessages = new Map([
  ['trailing whitespace', '行尾存在多余空白，请清理后重新暂存'],
  ['space before tab in indent', '缩进中存在制表符前的多余空格，请整理后重新暂存'],
  ['new blank line at EOF', '文件末尾新增了多余空行，请删除后重新暂存'],
  ['leftover conflict marker', '存在未解决的合并冲突标记，请解决冲突后重新暂存']
]);

export function translateGitCheck(output) {
  return output.trimEnd().split('\n').map(line => {
    const match = line.match(/^(.*):(\d+): (.+)$/u);
    if (!match) return line;
    const reason = match[3].replace(/\.$/u, '');
    const message = whitespaceMessages.get(reason);
    return message ? `${match[1]}:${match[2]}: ${message}` : line;
  }).join('\n');
}
