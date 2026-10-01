import {readFileSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {ensureDependencies, nodeEnv, policyRoot, requireNode, run} from './runtime.mjs';
import {translateGitCheck} from './diagnostics.mjs';
import {message} from './messages.cjs';
import {checkJava, formatJavaReport} from './java-check.mjs';

export function addedJavaViolations(diff, rules) {
  const violations = [];
  let line = 0;
  for (const text of diff.split('\n')) {
    const hunk = text.match(/^@@ .* \+(\d+)(?:,\d+)? @@/u);
    if (hunk) { line = Number(hunk[1]); continue; }
    if (text.startsWith('+++') || text.startsWith('---')) continue;
    if (text.startsWith('+')) {
      const source = text.slice(1);
      if (rules.rejectConsoleDebugCalls && /^\s*(?:System\.(?:out|err)\.(?:print|println|printf)\s*\(|(?:[\w$]+\.)?printStackTrace\s*\()/u.test(source)) {
        violations.push({line, rule: message('staged.java-console')});
      }
      if (rules.rejectSwagger2Imports && /^\s*import\s+(?:static\s+)?io\.swagger\.annotations\./u.test(source)) {
        violations.push({line, rule: message('staged.java-swagger2')});
      }
      line++;
    } else if (text.startsWith(' ')) line++;
  }
  return violations;
}

export function checkStaged(cwd = process.cwd()) {
  requireNode();
  const policy = JSON.parse(readFileSync(join(policyRoot, 'rules/policy.json'), 'utf8')).staged;
  const git = args => run('git', args, {cwd});
  const branchResult = spawnSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], {cwd, encoding: 'utf8', env: nodeEnv});
  if (branchResult.status !== 0) throw new Error(message('staged.unnamed-branch'));
  const branch = branchResult.stdout.trim();
  if (policy.forbiddenBranches.includes(branch)) throw new Error(message('staged.forbidden-branch', {branch}));
  if (policy.checkWhitespaceAndConflicts) {
    const result = spawnSync('git', ['diff', '--cached', '--check'], {cwd, encoding: 'utf8', env: nodeEnv});
    if (result.error) throw result.error;
    if (result.status !== 0) {
      const details = translateGitCheck((result.stdout || '') + (result.stderr || ''));
      throw new Error(`${message('staged.git-check-failed')}\n${details}`);
    }
  }
  const files = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(Boolean);
  const failures = [];
  for (const file of files) {
    if (policy.forbiddenFileNames.includes(basename(file))) failures.push(`${file}: ${message('staged.system-file')}`);
    if (policy.java.enabled !== false || !file.endsWith('.java') || (policy.java.excludeTestSources && /(?:^|\/)src\/test\//u.test(file))) continue;
    if ((policy.java.excludeDirectories || []).some(part => file.split('/').includes(part))) continue;
    const diff = git(['diff', '--cached', '--no-ext-diff', '--no-color', '--unified=0', '--', file]);
    for (const violation of addedJavaViolations(diff, policy.java)) failures.push(`${file}:${violation.line}: ${violation.rule}`);
  }
  if (failures.length) throw new Error(failures.join('\n'));
  const java = checkJava(cwd);
  if (java.errors.length) throw new Error(formatJavaReport(java));
  if (java.warnings.length) console.warn(formatJavaReport(java));
  console.log(message('staged.success', {count: files.length}));
}

function main() {
  const [hook, ...args] = process.argv.slice(2);
  if (hook === 'pre-commit') { checkStaged(); return; }
  if (hook !== 'commit-msg' || !args[0]) throw new Error('用法: node scripts/check.mjs pre-commit | commit-msg <提交说明文件>');
  if (!readFileSync(resolve(args[0]), 'utf8').trim()) {
    throw new Error(`${message('commit.empty-message')}\n${message('ui.example')}`);
  }
  const {cli} = ensureDependencies();
  const result = spawnSync(process.execPath, [cli, '--config', join(policyRoot, 'commitlint.config.cjs'), '--edit', resolve(args[0]), '--strict'], {stdio: 'inherit', env: nodeEnv});
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(); } catch (error) {
    console.error(`${message('ui.blocked')}\n${error.message}`);
    process.exitCode = 1;
  }
}
