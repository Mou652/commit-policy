import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

function repository() {
  const cwd = mkdtempSync(join(tmpdir(), 'commit-policy-java-test-'));
  git(cwd, 'init', '--initial-branch=feature/java-policy');
  return cwd;
}

function git(cwd, ...args) {
  const result = spawnSync('git', args, {cwd, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function stage(cwd, name, source) {
  const path = join(cwd, name);
  mkdirSync(join(path, '..'), {recursive: true});
  writeFileSync(path, source);
  git(cwd, 'add', '--', name);
}

test('Java AST: 多行违规可拦截，注释字符串不误报，Java 21 可解析', async () => {
  const {checkJava} = await import('../scripts/java-check.mjs');
  const cwd = repository();
  try {
    stage(cwd, 'src/main/java/BadExample.java', `import java.math.BigDecimal;
import java.util.concurrent.Executors;
class BadExample {
    BigDecimal amount() {
        return new BigDecimal(
            0.1);
    }
    Object pool() {
        return Executors.newFixedThreadPool(2);
    }
    boolean same(String left, String right) {
        return left == right;
    }
    void BadMethod() {
        if (true) System.out.println("debug");
    }
}
`);
    const report = checkJava(cwd);
    for (const rule of ['AvoidDecimalLiteralsInBigDecimalConstructor', 'AlibabaAvoidExecutorsFactory', 'UseEqualsToCompareStrings', 'MethodName', 'NeedBraces']) {
      assert.ok(report.errors.some(item => item.rule === rule), JSON.stringify(report));
    }
    assert.ok(report.errors.every(item => item.file === 'src/main/java/BadExample.java' && item.line > 0 && /\p{Script=Han}/u.test(item.message)));
    git(cwd, 'rm', '-f', '--', 'src/main/java/BadExample.java');
    stage(cwd, 'src/main/java/GoodExample.java', `record GoodExample(String value) {
    String describe(Object input) {
        // new BigDecimal(0.1); Executors.newFixedThreadPool(2);
        return switch (input) {
            case String text -> text;
            default -> "System.out.println; new Thread();";
        };
    }
}
`);
    assert.deepEqual(checkJava(cwd).errors, []);
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});

test('Java 暂存区: 工作区修复不会掩盖暂存违规，工作区未暂存违规不会误拦截', async () => {
  const {checkJava} = await import('../scripts/java-check.mjs');
  const cwd = repository();
  const path = 'folder with space/Example.java';
  const good = 'class Example { boolean same(String a, String b) { return a.equals(b); } }\n';
  const bad = 'class Example { boolean same(String a, String b) { return a == b; } }\n';
  try {
    stage(cwd, path, bad);
    writeFileSync(join(cwd, path), good);
    assert.ok(checkJava(cwd).errors.some(item => item.rule === 'UseEqualsToCompareStrings'));
    stage(cwd, path, good);
    writeFileSync(join(cwd, path), bad);
    assert.deepEqual(checkJava(cwd).errors, []);
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});

test('Java 增量: 只纳入违规起始行在新增行内的诊断，解析错误仍阻断', async () => {
  const {changedRanges, touchesChangedLine, checkJava} = await import('../scripts/java-check.mjs');
  const ranges = changedRanges('@@ -3,2 +3,3 @@\n@@ -9,1 +10,0 @@\n');
  assert.equal(touchesChangedLine(2, ranges), false);
  assert.equal(touchesChangedLine(3, ranges), true);
  assert.equal(touchesChangedLine(5, ranges), true);
  assert.equal(touchesChangedLine(10, ranges), false);
  const cwd = repository();
  try {
    stage(cwd, 'Broken.java', 'class Broken { void broken( }\n');
    assert.throws(() => checkJava(cwd), /解析|分析失败/u);
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});

test('Java 通用规范: 异常、集合和并发规则产生可定位的中文诊断', async () => {
  const {checkJava} = await import('../scripts/java-check.mjs');
  const cwd = repository();
  try {
    stage(cwd, 'Examples.java', `class Examples {
    void ignored() {
        try {
            Integer.parseInt("bad");
        } catch (NumberFormatException ignored) {
        }
    }
    void convert() {
        try {
            Integer.parseInt("bad");
        } catch (NumberFormatException failure) {
            throw new IllegalStateException(failure.getMessage());
        }
    }
    int result() {
        try { return Integer.parseInt("bad"); }
        finally { return 1; }
    }
    String[] array(java.util.List<String> values) {
        return (String[]) values.toArray();
    }
    Object list(int[] values) {
        return java.util.Arrays.asList(values);
    }
    void execute(Thread thread) {
        thread.run();
    }
}
`);
    const report = checkJava(cwd);
    for (const rule of ['EmptyCatchBlock', 'PreserveStackTrace', 'ReturnFromFinallyBlock', 'ClassCastExceptionWithToArray', 'AlibabaAvoidPrimitiveArrayAsList', 'DontCallThreadRun']) {
      assert.ok(report.errors.some(item => item.rule === rule), JSON.stringify(report));
    }
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});

test('Java 阿里扩展: 识别静态导入与全限定名，同名自定义工厂和虚拟线程不误报', async () => {
  const {checkJava} = await import('../scripts/java-check.mjs');
  const cwd = repository();
  try {
    stage(cwd, 'Factories.java', `import static java.util.concurrent.Executors.newSingleThreadExecutor;
class Factories {
    Object single() { return newSingleThreadExecutor(); }
    Object cached() { return java.util.concurrent.Executors.newCachedThreadPool(); }
    Object virtual() { return java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor(); }
}
`);
    stage(cwd, 'LocalFactoryExample.java', `class LocalFactoryExample {
    static class Executors {
        static Object newFixedThreadPool(int count) { return null; }
    }
    Object pool() { return Executors.newFixedThreadPool(2); }
}
`);
    const errors = checkJava(cwd).errors.filter(item => item.rule === 'AlibabaAvoidExecutorsFactory');
    assert.deepEqual(errors.map(item => [item.file, item.line]), [['Factories.java', 3], ['Factories.java', 4]]);
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});

test('Java 建议: 默认只提示，strict 模式才升级为阻断', async () => {
  const {checkJava} = await import('../scripts/java-check.mjs');
  const cwd = repository();
  try {
    stage(cwd, 'WorkerFactory.java', 'class WorkerFactory { Thread worker() { return new Thread(() -> {}); } }\n');
    const report = checkJava(cwd);
    assert.deepEqual(report.errors, []);
    assert.ok(report.warnings.some(item => item.rule === 'AlibabaAvoidNewThread'));
    assert.ok(checkJava(cwd, {strict: true}).errors.some(item => item.rule === 'AlibabaAvoidNewThread'));
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});


test('Java Hook 集成: 注释和文本块不误报旧调试语句，真实调用仍拦截', async () => {
  const {checkStaged} = await import('../scripts/check.mjs');
  const cwd = repository();
  try {
    stage(cwd, 'DocumentExample.java', `class DocumentExample {
    /*
    System.out.println("comment only");
    import io.swagger.annotations.Api;
    */
    String sample() {
        return """
            System.out.println("text only");
            import io.swagger.annotations.Api;
            """;
    }
}
`);
    assert.doesNotThrow(() => checkStaged(cwd));
    stage(cwd, 'DocumentExample.java', 'class DocumentExample { void output() { System.out.println("real"); } }\n');
    assert.throws(() => checkStaged(cwd), /System\.out/u);
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});

test('Java 真实增量: 历史违规不阻断无关新行，本次改动违规会阻断', async () => {
  const {checkJava} = await import('../scripts/java-check.mjs');
  const cwd = repository();
  const original = `class Legacy {
    boolean same(String a, String b) { return a == b; }
    int value() { return 1; }
}
`;
  try {
    stage(cwd, 'Legacy.java', original);
    const tree = git(cwd, 'write-tree').trim();
    const base = git(cwd, '-c', 'user.name=Policy Test', '-c', 'user.email=policy-test@example.invalid', 'commit-tree', tree, '-m', 'isolated fixture baseline').trim();
    git(cwd, 'update-ref', 'HEAD', base);
    stage(cwd, 'Legacy.java', original.replace('return 1;', 'return 2;'));
    const report = checkJava(cwd);
    assert.deepEqual(report.errors, []);
    assert.ok(report.ignored > 0);
    assert.ok(checkJava(cwd, {allTracked: true}).errors.some(item => item.rule === 'UseEqualsToCompareStrings'));
    stage(cwd, 'Legacy.java', original.replace('a == b', 'a != b'));
    assert.ok(checkJava(cwd).errors.some(item => item.rule === 'UseEqualsToCompareStrings' && item.line === 2));
  } finally { rmSync(cwd, {recursive: true, force: true}); }
});
