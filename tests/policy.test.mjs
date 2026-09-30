import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import {checkStaged} from '../scripts/check.mjs';
import {nodeEnv, policyRoot, run} from '../scripts/runtime.mjs';

const cli = join(policyRoot, 'node_modules/@commitlint/cli/cli.js');
const lint = message => spawnSync(process.execPath, [cli, '--config', join(policyRoot, 'commitlint.config.cjs'), '--strict'], {input: message, encoding: 'utf8', env: nodeEnv});
const valid = 'fix: 修复重复请求以避免产生重复记录';

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
    stage(cwd, 'src/main/java/Example.java', 'System.out.println("staged");\n');
    writeFileSync(join(cwd, 'src/main/java/Example.java'), 'class Example {}\n');
    assert.throws(() => checkStaged(cwd), /控制台/u);
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});

test('暂存区: 空白、冲突标记、系统文件、旧注解和调试输出拒绝', () => {
  const cases = [
    ['sample.txt', 'line  \n', /执行失败/u],
    ['sample.txt', '<<<<<<< HEAD\nleft\n=======\nright\n>>>>>>> other\n', /执行失败/u],
    ['folder/.DS_Store', 'dummy\n', /系统文件/u],
    ['src/main/java/Example.java', 'import io.swagger.annotations.Api;\n', /Swagger2/u],
    ['src/main/java/Example.java', 'exception.printStackTrace();\n', /printStackTrace/u]
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
