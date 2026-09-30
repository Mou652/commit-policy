const {message, hasMessage} = require('./messages.cjs');

module.exports = function formatChinese(report = {}) {
  const problems = (report.results || []).flatMap(result => [
    ...(result.errors || []), ...(result.warnings || [])
  ]);
  if (!problems.length) return message('ui.success');
  const lines = [message('ui.blocked'), '', message('ui.reasons')];
  for (const [index, problem] of problems.entries()) {
    const id = `commitlint.${problem.name}`;
    const reason = hasMessage(id) ? message(id) : problem.message;
    lines.push(`  ${index + 1}. ${reason}`);
  }
  lines.push('', message('ui.format'), message('ui.example'), message('ui.retry'));
  return lines.join('\n');
};
