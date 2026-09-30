const policy = require('./rules/policy.json').commit;
const {message} = require('./scripts/messages.cjs');

function description(subject = '') {
  return (subject ?? '').replace(/(?: \[[^\]\r\n]+\])?(?: \(#[A-Za-z0-9._/-]+\))?$/u, '');
}

module.exports = {
  extends: ['@commitlint/config-conventional'],
  formatter: require.resolve('./scripts/format-zh.cjs'),
  defaultIgnores: false,
  plugins: [{
    rules: {
      'policy-single-line': ({raw = ''}) => [
        !policy.singleLine || !/[\r\n]/u.test(raw.trimEnd()),
        message('commit.single-line')
      ],
      'policy-header-format': ({header = ''}) => [
        /^[a-z]+: \S.*$/u.test(header),
        message('commit.header-format')
      ],
      'policy-subject': ({subject = ''}) => {
        const value = description(subject);
        const count = (value.match(/\p{Script=Han}/gu) || []).length;
        const chinese = !policy.subject.requireChinese ||
          (count >= policy.subject.minChineseCharacters && count <= policy.subject.maxChineseCharacters);
        const letters = policy.subject.allowAsciiLetters || !/[a-z]/iu.test(value);
        const emoji = policy.subject.allowEmoji || !/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(subject);
        const reasons = [];
        if (!chinese) reasons.push(message('commit.subject-chinese-length', {count}));
        if (!letters) reasons.push(message('commit.subject-ascii-letters'));
        if (!emoji) reasons.push(message('commit.subject-emoji'));
        return [chinese && letters && emoji, reasons.join('；')];
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
