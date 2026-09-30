import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

export const policyRoot = dirname(dirname(fileURLToPath(import.meta.url)));
export const nodeEnv = {...process.env, PATH: `${dirname(process.execPath)}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH || ''}`};

export function requireNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) throw new Error('需要 Node.js >= 22.12.0；请使用已有的兼容 Node.js 后重新接入');
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: 'utf8', env: nodeEnv, ...options});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} 执行失败 (${result.status})\n${result.stderr || result.stdout || ''}`);
  return result.stdout || '';
}

export function ensureDependencies() {
  requireNode();
  const lock = readFileSync(join(policyRoot, 'package-lock.json'));
  const hash = createHash('sha256').update(lock).digest('hex');
  const marker = join(policyRoot, 'node_modules', '.commit-policy-lock');
  const cli = join(policyRoot, 'node_modules', '@commitlint', 'cli', 'cli.js');
  const lefthook = join(policyRoot, 'node_modules', 'lefthook', 'bin', 'index.js');
  if (!existsSync(cli) || !existsSync(lefthook) || !existsSync(marker) || readFileSync(marker, 'utf8') !== hash) {
    console.error('[commit-policy] 安装锁定版本的检查工具；后续只在依赖变更时更新');
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {cwd: policyRoot, stdio: 'inherit'});
    if (!existsSync(cli) || !existsSync(lefthook)) throw new Error('检查工具安装不完整，停止检查');
    writeFileSync(marker, hash);
  }
  return {cli, lefthook};
}
