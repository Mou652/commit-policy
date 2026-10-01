import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, renameSync, rmSync} from 'node:fs';
import {homedir} from 'node:os';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {policyRoot, nodeEnv} from './runtime.mjs';

const manifest = JSON.parse(readFileSync(join(policyRoot, 'rules/java-tools.json'), 'utf8'));
export const toolCache = resolve(process.env.COMMIT_POLICY_TOOL_CACHE || join(homedir(), '.cache/commit-policy/java-tools'));

function execute(command, args, timeout = 300000) {
  const result = spawnSync(command, args, {encoding: 'utf8', env: nodeEnv, timeout, maxBuffer: 8 * 1024 * 1024});
  if (result.error || result.status !== 0) throw new Error(`Java 检查工具准备失败: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}

export function findJava() {
  const candidates = [];
  if (process.env.COMMIT_POLICY_JAVA_HOME) candidates.push(join(process.env.COMMIT_POLICY_JAVA_HOME, 'bin/java'));
  else {
    if (process.env.JAVA_HOME) candidates.push(join(process.env.JAVA_HOME, 'bin/java'));
    if (process.platform === 'darwin') {
      const detected = spawnSync('/usr/libexec/java_home', ['-v', '21+'], {encoding: 'utf8'});
      if (detected.status === 0) candidates.push(join(detected.stdout.trim(), 'bin/java'));
    }
    candidates.push('java');
  }
  for (const binary of candidates) {
    const result = spawnSync(binary, ['-XshowSettings:properties', '-version'], {encoding: 'utf8', timeout: 10000});
    const output = (result.stdout || '') + (result.stderr || '');
    const major = Number(output.match(/java\.specification\.version\s*=\s*(?:1\.)?(\d+)/u)?.[1]);
    const home = output.match(/java\.home\s*=\s*([^\r\n]+)/u)?.[1].trim();
    if (result.status === 0 && major >= 21 && home) return {binary, home, major};
  }
  throw new Error('Java 规范检查需要已有 JDK 21 或更高版本，请设置 COMMIT_POLICY_JAVA_HOME 后重试');
}

function verifiedArchive(tool, directory) {
  const spec = manifest[tool];
  const name = new URL(spec.url).pathname.split('/').pop();
  const existing = join(toolCache, name);
  const file = existsSync(existing) ? existing : join(directory, name);
  if (!existsSync(file)) {
    console.error(`[Java 检查] 首次下载 ${tool} ${spec.version}，完成后在本机共享缓存`);
    execute('curl', ['--fail', '--location', '--silent', '--show-error', '--connect-timeout', '15', '--max-time', '300', '--output', file, spec.url]);
  }
  const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (digest !== spec.sha256) throw new Error(`${tool} 下载文件校验失败，请检查网络或清理该工具缓存后重试`);
  return file;
}

export function ensureJavaTools() {
  const java = findJava();
  mkdirSync(toolCache, {recursive: true});
  const pmdHome = join(toolCache, `pmd-${manifest.pmd.version}`);
  const pmdMarker = join(pmdHome, '.verified-sha256');
  if (!existsSync(pmdMarker) || readFileSync(pmdMarker, 'utf8') !== manifest.pmd.sha256) {
    const staging = mkdtempSync(join(toolCache, '.pmd-install-'));
    try {
      const archive = verifiedArchive('pmd', staging);
      execute('unzip', ['-q', archive, '-d', staging]);
      const extracted = join(staging, `pmd-bin-${manifest.pmd.version}`);
      writeFileSync(join(extracted, '.verified-sha256'), manifest.pmd.sha256);
      if (existsSync(pmdHome)) {
        if (!existsSync(pmdMarker) || readFileSync(pmdMarker, 'utf8') !== manifest.pmd.sha256) throw new Error(`PMD 缓存不完整，请清理 ${pmdHome} 后重试`);
      } else {
        try { renameSync(extracted, pmdHome); }
        catch (error) {
          if (!existsSync(pmdMarker) || readFileSync(pmdMarker, 'utf8') !== manifest.pmd.sha256) throw error;
        }
      }
    } finally { rmSync(staging, {recursive: true, force: true}); }
  }
  const checkstyle = join(toolCache, `checkstyle-${manifest.checkstyle.version}-all.jar`);
  const staging = mkdtempSync(join(toolCache, '.checkstyle-install-'));
  try {
    const archive = verifiedArchive('checkstyle', staging);
    if (archive !== checkstyle) renameSync(archive, checkstyle);
  } finally { rmSync(staging, {recursive: true, force: true}); }
  return {java, pmdClasspath: join(pmdHome, 'lib', '*'), checkstyle};
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const tools = ensureJavaTools();
    console.log(`[Java 检查] JDK ${tools.java.major}，PMD ${manifest.pmd.version}，Checkstyle ${manifest.checkstyle.version} 已就绪\n缓存: ${toolCache}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
