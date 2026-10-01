import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {checkStaged} from '../scripts/check.mjs';
import {translateGitCheck} from '../scripts/diagnostics.mjs';
import {nodeEnv, policyRoot, run} from '../scripts/runtime.mjs';

const cli = join(policyRoot, 'node_modules/@commitlint/cli/cli.js');
const lint = message => spawnSync(process.execPath, [cli, '--config', join(policyRoot, 'commitlint.config.cjs'), '--strict'], {input: message, encoding: 'utf8', env: nodeEnv});
const valid = 'fix: 修复重复请求以避免产生重复记录';
const formatChinese = createRequire(import.meta.url)('../scripts/format-zh.cjs');

test('提交规范: 合法中文、模块任务标识和末尾换行通过', () => {
  for (const message of [valid, `${valid} [common-core] (#TASK-12)`, `${valid}\n`, `docs: ${'中'.repeat(10)}`, `docs: ${'中'.repeat(30)}`]) {
    const result = lint(message);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
});

test('提交规范: 错误类型、正文、英文、表情、长度和默认 merge 消息拒绝', () => {
  for (const message of ['', `style: ${'中'.repeat(12)}`, `${valid}\n\n正文说明`, 'fix: 修复重复请求以避免API重复调用', `${valid} 😀`, 'fix: 修复问题', `docs: ${'中'.repeat(31)}`, `feat(core): ${'中'.repeat(12)}`, "Merge branch 'feature'", `fix:${'中'.repeat(12)}`]) {
    assert.notEqual(lint(message).status, 0, message);
  }
});

test('中文提示: 基础规则和自定义规则显示修改建议，错误退出码保持为 3', () => {
  const cases = [
    [`style: ${'中'.repeat(12)}`, /允许的类型/u],
    ['fix: 修复问题', /当前为 4 个/u],
    ['fix: 修复重复请求以避免API重复调用', /简述不能包含英文字母/u],
    [`${valid} 😀`, /不能包含表情/u],
    [`${valid}.`, /英文句号/u],
    [`${valid} [${'module'.repeat(20)}]`, /不能超过 100/u]
  ];
  for (const [message, expected] of cases) {
    const result = lint(message);
    assert.equal(result.status, 3, result.stdout + result.stderr);
    assert.match(result.stdout, /已阻止本次提交/u);
    assert.match(result.stdout, expected);
    assert.match(result.stdout, /合法示例/u);
    assert.doesNotMatch(result.stdout, /found .* problems|subject must|type must/u);
  }
  assert.match(lint(valid).stdout, /提交说明检查通过/u);
});

test('中文提示: 无法解析简述的提交正常拒绝，不抛空值异常', () => {
  for (const message of ['测试', 'fix:', 'fix: ', 'fix 修复重复请求以避免产生重复记录']) {
    const result = lint(message);
    assert.equal(result.status, 3, result.stdout + result.stderr);
    assert.match(result.stdout, /已阻止本次提交/u);
    assert.match(result.stdout, /格式必须为/u);
    assert.match(result.stdout, /提交简述不能为空/u);
    assert.match(result.stdout, /合法示例/u);
    assert.doesNotMatch(result.stdout + result.stderr, /TypeError|Cannot read properties/u);
  }
});

test('中文提示: 保留警告和未知规则原因，不丢失诊断', () => {
  const output = formatChinese({results: [{errors: [{name: 'future-rule', message: '保留新规则的原始原因'}], warnings: [{name: 'type-case', message: 'type must be lower-case'}]}]});
  assert.match(output, /保留新规则的原始原因/u);
  assert.match(output, /必须使用小写字母/u);
});

test('中文提示: 文案模板从规则配置读取参数，自定义规则无需增加映射', async () => {
  const {message} = await import('../scripts/messages.cjs');
  assert.equal(message('commit.subject-chinese-length', {count: 4}), '中文简述须含 10 到 30 个汉字，当前为 4 个');
  assert.equal(message('commitlint.type-enum'), '提交类型不符合规范，允许的类型: feat、fix、refactor、perf、docs、test、chore、build、ci、revert');
  const output = formatChinese({results: [{errors: [{name: 'new-team-rule', message: '新规则直接提供中文原因和修改建议'}], warnings: []}]});
  assert.match(output, /新规则直接提供中文原因和修改建议/u);
  assert.throws(() => message('commit.subject-chinese-length'), /缺少参数 count/u);

  const directory = mkdtempSync(join(tmpdir(), 'commit-policy-catalog-'));
  try {
    mkdirSync(join(directory, 'scripts'));
    mkdirSync(join(directory, 'rules'));
    for (const file of ['scripts/messages.cjs', 'scripts/format-zh.cjs', 'rules/messages.zh-CN.json', 'rules/policy.json']) {
      writeFileSync(join(directory, file), readFileSync(join(policyRoot, file)));
    }
    const changedPolicy = JSON.parse(readFileSync(join(directory, 'rules/policy.json')));
    changedPolicy.commit.types = ['fix'];
    changedPolicy.commit.subject.minChineseCharacters = 3;
    changedPolicy.commit.subject.maxChineseCharacters = 6;
    changedPolicy.commit.futureLimit = 5;
    writeFileSync(join(directory, 'rules/policy.json'), JSON.stringify(changedPolicy));
    const catalog = JSON.parse(readFileSync(join(directory, 'rules/messages.zh-CN.json')));
    catalog.messages['commitlint.new-rule'] = '新规则限制为 {{commit.futureLimit}}';
    writeFileSync(join(directory, 'rules/messages.zh-CN.json'), JSON.stringify(catalog));
    const isolatedRequire = createRequire(join(directory, 'entry.cjs'));
    const isolatedMessages = isolatedRequire('./scripts/messages.cjs');
    assert.equal(isolatedMessages.message('commit.subject-chinese-length', {count: 2}), '中文简述须含 3 到 6 个汉字，当前为 2 个');
    const isolatedFormat = isolatedRequire('./scripts/format-zh.cjs');
    const report = {results: [{errors: [{name: 'type-enum', message: 'original type error'}, {name: 'new-rule', message: 'original new error'}], warnings: []}]};
    const formatted = isolatedFormat(report);
    assert.match(formatted, /允许的类型: fix\n/u);
    assert.match(formatted, /新规则限制为 5/u);
  } finally { rmSync(directory, {recursive: true, force: true}); }
});

test('中文提示: Git 错误保留文件行号和无法翻译的原始诊断', () => {
  const output = translateGitCheck('path:with space.txt:12: trailing whitespace.\nother.txt:7: leftover conflict marker\nfatal: original diagnostic\n');
  assert.match(output, /path:with space.txt:12: 行尾存在多余空白/u);
  assert.match(output, /other.txt:7: 存在未解决/u);
  assert.match(output, /fatal: original diagnostic/u);
});

test('中文提示: 空提交说明直接给出中文原因，没有真实提交', () => {
  const directory = mkdtempSync(join(tmpdir(), 'commit-policy-message-'));
  try {
    const file = join(directory, 'message.txt');
    writeFileSync(file, '\n');
    const result = spawnSync(process.execPath, [join(policyRoot, 'scripts/check.mjs'), 'commit-msg', file], {encoding: 'utf8', env: nodeEnv});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /提交说明不能为空/u);
    assert.match(result.stderr, /合法示例/u);
  } finally { rmSync(directory, {recursive: true, force: true}); }
});

function repository() {
  const cwd = mkdtempSync(join(tmpdir(), 'commit-policy-test-'));
  run('git', ['init', '--initial-branch=feature/policy-test'], {cwd});
  return cwd;
}

function stage(cwd, file, content) {
  mkdirSync(join(cwd, file, '..'), {recursive: true});
  writeFileSync(join(cwd, file), content);
  run('git', ['add', '--', file], {cwd});
}

test('暂存区快照: 未暂存的工作区内容不影响检查，无真实提交', () => {
  const cwd = repository();
  try {
    stage(cwd, 'src/main/java/Example.java', 'class Example {}\n');
    writeFileSync(join(cwd, 'src/main/java/Example.java'), 'System.out.println("worktree only");\n');
    checkStaged(cwd);
    stage(cwd, 'src/main/java/Example.java', 'class Example { void output() { System.out.println("staged"); } }\n');
    writeFileSync(join(cwd, 'src/main/java/Example.java'), 'class Example {}\n');
    assert.throws(() => checkStaged(cwd), /System\.out/u);
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});

test('暂存区: 空白、冲突标记、系统文件、旧注解和调试输出拒绝', () => {
  const cases = [
    ['sample.txt', 'line  \n', /行尾存在多余空白/u],
    ['sample.txt', '<<<<<<< HEAD\nleft\n=======\nright\n>>>>>>> other\n', /未解决的合并冲突/u],
    ['folder/.DS_Store', 'dummy\n', /系统文件/u],
    ['src/main/java/Example.java', 'import io.swagger.annotations.Api;\n@Api class Example {}\n', /Swagger2/u],
    ['src/main/java/Example.java', 'class Example { void log(Exception failure) { failure.printStackTrace(); } }\n', /printStackTrace/u]
  ];
  for (const [file, content, expected] of cases) {
    const cwd = repository();
    try { stage(cwd, file, content); assert.throws(() => checkStaged(cwd), expected); }
    finally { rmSync(cwd, {recursive: true, force: true}); }
  }
});

test('暂存区: test 分支拒绝，测试源文件允许控制台调用', () => {
  const cwd = repository();
  try {
    stage(cwd, 'src/test/java/ExampleTest.java', 'System.out.println("test");\n');
    checkStaged(cwd);
    run('git', ['symbolic-ref', 'HEAD', 'refs/heads/test'], {cwd});
    assert.throws(() => checkStaged(cwd), /禁止在 test/u);
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});
