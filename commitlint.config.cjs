const policy = require('./rules/policy.json').commit;

function description(subject = '') {
  return subject.replace(/(?: \[[^\]\r\n]+\])?(?: \(#[A-Za-z0-9._/-]+\))?$/u, '');
}

module.exports = {
  extends: ['@commitlint/config-conventional'],
  defaultIgnores: false,
  plugins: [{
    rules: {
      'policy-single-line': ({raw = ''}) => [
        !policy.singleLine || !/[\r\n]/u.test(raw.trimEnd()),
        '提交说明只允许单行，不允许正文或脚注'
      ],
      'policy-header-format': ({header = ''}) => [
        /^[a-z]+: \S.*$/u.test(header),
        '格式必须为 <类型>: <简述>，可追加 [模块] 和 (#任务号)'
      ],
      'policy-subject': ({subject = ''}) => {
        const value = description(subject);
        const count = (value.match(/\p{Script=Han}/gu) || []).length;
        const chinese = !policy.subject.requireChinese ||
          (count >= policy.subject.minChineseCharacters && count <= policy.subject.maxChineseCharacters);
        const letters = policy.subject.allowAsciiLetters || !/[a-z]/iu.test(value);
        const emoji = policy.subject.allowEmoji || !/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(subject);
        return [chinese && letters && emoji,
          `简述须含 ${policy.subject.minChineseCharacters} 到 ${policy.subject.maxChineseCharacters} 个汉字，英文仅允许出现在模块或任务标识中，禁止表情`];
      }
    }
  }],
  rules: {
    'type-enum': [2, 'always', policy.types],
    'header-max-length': [2, 'always', policy.headerMaxLength],
    'subject-case': [0],
    'policy-single-line': [2, 'always'],
    'policy-header-format': [2, 'always'],
    'policy-subject': [2, 'always']
  }
};
