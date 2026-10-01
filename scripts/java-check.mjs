import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve, isAbsolute} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {policyRoot, nodeEnv, run} from './runtime.mjs';
import {ensureJavaTools} from './java-tools.mjs';

const catalog = JSON.parse(readFileSync(join(policyRoot, 'rules/java.json'), 'utf8')).rules;
const stagedPolicy = JSON.parse(readFileSync(join(policyRoot, 'rules/policy.json'), 'utf8')).staged;
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function changedRanges(diff) {
  return [...diff.matchAll(/^@@ .* \+(\d+)(?:,(\d+))? @@/gmu)].map(match => [Number(match[1]), Number(match[2] ?? 1)]).filter(([, count]) => count > 0);
}

export function touchesChangedLine(line, ranges) {
  return ranges.some(([start, count]) => line >= start && line < start + count);
}

function configurations(directory, rules) {
  const properties = values => Object.entries(values || {}).map(([name, value]) => `<property name="${xml(name)}" value="${xml(value)}"/>`).join('');
  const pmdRules = rules.filter(rule => rule.engine === 'pmd').map(rule => {
    if (rule.xpath) return `<rule name="${xml(rule.name)}" language="java" message="${xml(rule.message)}" class="net.sourceforge.pmd.lang.rule.xpath.XPathRule"><description>${xml(rule.message)}</description><priority>3</priority><properties>${properties({xpath: rule.xpath})}</properties></rule>`;
    return `<rule ref="${xml(rule.ref)}" message="${xml(rule.message)}"><properties>${properties(rule.properties)}</properties></rule>`;
  }).join('\n');
  const pmd = join(directory, 'pmd.xml');
  writeFileSync(pmd, `<?xml version="1.0" encoding="UTF-8"?><ruleset name="commit-policy" xmlns="http://pmd.sourceforge.net/ruleset/2.0.0"><description>Shared Java policy</description>${pmdRules}</ruleset>`);
  const checkstyle = join(directory, 'checkstyle.xml');
  const checks = rules.filter(rule => rule.engine === 'checkstyle').map(rule => `<module name="${xml(rule.name)}">${properties(rule.properties)}</module>`).join('\n');
  writeFileSync(checkstyle, `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE module PUBLIC "-//Puppy Crawl//DTD Check Configuration 1.3//EN" "https://checkstyle.org/dtds/configuration_1_3.dtd"><module name="Checker"><property name="charset" value="UTF-8"/><module name="TreeWalker">${checks}</module></module>`);
  return {pmd, checkstyle};
}

function execute(java, args, reportFile, engine) {
  const result = spawnSync(java, ['-Xmx512m', '-Dfile.encoding=UTF-8', ...args], {env: nodeEnv, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024});
  if (result.error || result.signal || !existsSync(reportFile)) throw new Error(`${engine} 分析失败: ${result.error?.message || result.stderr || result.stdout}`);
  let report;
  try { report = JSON.parse(readFileSync(reportFile, 'utf8')); }
  catch { throw new Error(`${engine} 分析失败，报告不是有效 JSON: ${result.stderr}`); }
  return {report, status: result.status, diagnostic: result.stderr};
}

export function checkJava(cwd = process.cwd(), {allTracked = false, strict = false} = {}) {
  const git = args => run('git', ['--literal-pathspecs', ...args], {cwd, maxBuffer: 32 * 1024 * 1024});
  const config = stagedPolicy.java;
  const names = git(allTracked ? ['ls-files', '-z'] : ['diff', '--cached', '--name-only', '--no-renames', '--diff-filter=ACM', '-z']).split('\0').filter(Boolean);
  const files = names.filter(name => name.endsWith('.java') &&
    !(config.excludeTestSources && /(?:^|\/)src\/test\//u.test(name)) &&
    !(config.excludeDirectories || ['target', 'build', 'generated-sources']).some(part => name.split('/').includes(part)));
  const report = {files: files.length, errors: [], warnings: [], ignored: 0};
  if (!files.length || config.enabled === false) return report;
  const rules = catalog.filter(rule => rule.level !== 'off' &&
    !(config.rejectConsoleDebugCalls === false && ['SystemPrintln', 'AvoidPrintStackTrace'].includes(rule.name)) &&
    !(config.rejectSwagger2Imports === false && rule.name === 'IllegalImport'));
  for (const rule of rules) {
    if (!['error', 'warning'].includes(rule.level) || !['pmd', 'checkstyle'].includes(rule.engine) || !rule.message) throw new Error(`Java 规则配置无效: ${rule.name}`);
  }
  const directory = mkdtempSync(join(tmpdir(), 'commit-policy-java-'));
  try {
    const snapshot = join(directory, 'source');
    mkdirSync(snapshot);
    const ranges = new Map();
    for (const name of files) {
      const destination = resolve(snapshot, name);
      const safe = relative(snapshot, destination);
      if (safe.startsWith('..') || isAbsolute(safe)) throw new Error(`Java 文件路径无效: ${name}`);
      mkdirSync(dirname(destination), {recursive: true});
      writeFileSync(destination, git(['show', `:${name}`]));
      ranges.set(name, allTracked ? null : changedRanges(git(['diff', '--cached', '--no-ext-diff', '--no-color', '--no-renames', '--unified=0', '--', name])));
    }
    const tools = ensureJavaTools();
    const configs = configurations(directory, rules);
    const map = new Map(rules.map(rule => [`${rule.engine}/${rule.name}`, rule]));
    const add = (engine, ruleName, filename, line, column = 1) => {
      const rule = map.get(`${engine}/${ruleName}`);
      if (!rule) throw new Error(`${engine} 解析或分析失败: ${ruleName}，请检查 Java 语法与规则配置`);
      const absolute = filename.startsWith('file:') ? fileURLToPath(filename) : resolve(filename);
      const file = relative(snapshot, absolute).split('\\').join('/');
      if (!ranges.has(file)) throw new Error(`${engine} 报告包含未知文件: ${filename}`);
      if (!allTracked && !touchesChangedLine(line, ranges.get(file))) { report.ignored++; return; }
      const item = {engine, rule: ruleName, file, line, column, message: rule.message};
      (rule.level === 'error' || strict ? report.errors : report.warnings).push(item);
    };
    if (rules.some(rule => rule.engine === 'pmd')) {
      const output = join(directory, 'pmd.json');
      const args = ['-cp', tools.pmdClasspath, 'net.sourceforge.pmd.cli.PmdCli', 'check', '-d', snapshot, '-R', configs.pmd, '-f', 'json', '-r', output, '--use-version', `java-${config.sourceVersion || '21'}`, '--no-cache', '--no-progress', '--threads', '1'];
      const jrt = join(tools.java.home, 'lib/jrt-fs.jar');
      if (existsSync(jrt)) args.push('--aux-classpath', jrt);
      const result = execute(tools.java.binary, args, output, 'PMD');
      if (![0, 4].includes(result.status) || result.report.processingErrors?.length || result.report.configurationErrors?.length) {
        throw new Error(`PMD 解析或分析失败: ${JSON.stringify(result.report.processingErrors || [])}\n${JSON.stringify(result.report.configurationErrors || [])}\n${result.diagnostic}`);
      }
      for (const file of result.report.files || []) for (const issue of file.violations || []) add('pmd', issue.rule, file.filename, issue.beginline, issue.begincolumn);
    }
    if (rules.some(rule => rule.engine === 'checkstyle')) {
      const output = join(directory, 'checkstyle.json');
      const result = execute(tools.java.binary, ['-jar', tools.checkstyle, '-c', configs.checkstyle, '-f', 'sarif', '-o', output, snapshot], output, 'Checkstyle');
      const issues = (result.report.runs || []).flatMap(item => item.results || []);
      if (result.status !== 0 && !issues.length) throw new Error(`Checkstyle 分析失败: ${result.diagnostic}`);
      for (const issue of issues) {
        const location = issue.locations?.[0]?.physicalLocation;
        if (!location) throw new Error(`Checkstyle 解析或分析失败: ${issue.message?.text}`);
        const rule = issue.ruleId.split('.').pop().replace(/Check$/u, '');
        add('checkstyle', rule, location.artifactLocation.uri, location.region.startLine, location.region.startColumn);
      }
    }
    return report;
  } finally { rmSync(directory, {recursive: true, force: true}); }
}

export function formatJavaReport(report) {
  const entries = [...report.errors.map(item => ({...item, level: '阻断'})), ...report.warnings.map(item => ({...item, level: '建议'}))];
  const lines = entries.slice(0, 50).map(item => `${item.file}:${item.line}:${item.column}: [${item.level}] ${item.message} (${item.engine}/${item.rule})`);
  if (entries.length > 50) lines.push(`另有 ${entries.length - 50} 条诊断，请运行 Java 检查的 --json 模式查看完整结果`);
  return lines.join('\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    const cwd = resolve(args.find(arg => !arg.startsWith('--')) || process.cwd());
    const report = checkJava(cwd, {allTracked: args.includes('--all'), strict: args.includes('--strict')});
    console.log(args.includes('--json') ? JSON.stringify(report, null, 2) : `${formatJavaReport(report)}\n[Java 检查] ${report.files} 个文件，${report.errors.length} 项阻断，${report.warnings.length} 项建议`);
    process.exitCode = report.errors.length ? 1 : 0;
  } catch (error) { console.error(`[Java 检查] ${error.message}`); process.exitCode = 1; }
}
