const policy = require('../rules/policy.json').commit;

const messages = {
  'type-empty': '提交类型不能为空，请填写 feat、fix 等类型',
  'type-case': '提交类型必须使用小写字母',
  'type-enum': () => `提交类型不符合规范，允许的类型: ${policy.types.join('、')}`,
  'subject-empty': '提交简述不能为空，请说明本次修改的内容和原因',
  'subject-full-stop': '提交主题不能以英文句号结尾，请删除末尾的 .',
  'header-max-length': () => `整条提交说明不能超过 ${policy.headerMaxLength} 个字符，请缩短说明或模块标识`,
  'header-trim': '提交标题首尾不能有多余空白，请删除开头或末尾的空格',
  'body-leading-blank': '正文与标题之间需要空行；当前规则只允许单行，请删除正文',
  'body-max-line-length': '正文单行过长；当前规则只允许单行，请删除正文',
  'footer-leading-blank': '脚注与正文之间需要空行；当前规则只允许单行，请删除脚注',
  'footer-max-line-length': '脚注单行过长；当前规则只允许单行，请删除脚注',
  'empty-rules': '未加载到提交规则，请重新运行接入命令'
};

module.exports = function formatChinese(report = {}) {
  const problems = (report.results || []).flatMap(result => [
    ...(result.errors || []), ...(result.warnings || [])
  ]);
  if (!problems.length) return '[提交检查] 提交说明检查通过';
  const lines = ['[提交检查] 已阻止本次提交', '', '违规原因:'];
  for (const [index, problem] of problems.entries()) {
    const translated = messages[problem.name];
    const message = typeof translated === 'function' ? translated() : translated || problem.message;
    lines.push(`  ${index + 1}. ${message}`);
  }
  lines.push('', '修改格式: <类型>: <中文简述>，可追加 [模块] 和 (#任务号)',
    '合法示例: fix: 修复重复请求以避免产生重复记录',
    '修改提交说明后重新提交，本次提交没有完成');
  return lines.join('\n');
};
