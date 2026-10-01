# commit-policy

公开的团队本地 Git 提交规则。复用 **Lefthook 2.1.15** 执行 Hook，复用 **commitlint 21.2.3** 解析和检查提交说明，复用 **PMD 7.28.0 + Checkstyle 14.3.0** 检查 Java 源码。

业务仓库可以在内网 GitLab，规则仓库在 GitHub。开发者通过 HTTPS 匿名读取规则，不需要 GitHub 账号、Token 或仓库写权限。检查在开发者电脑执行。

## 快速接入

需要已有的 Git、Node.js >= 22.12.0、npm，以及访问 GitHub 和 npm 下载源的网络。Java 检查还需要已有 JDK 21+、curl、unzip；检查工具的 JDK 不要求与业务编译 JDK 相同，不修改业务 Maven/Gradle 配置。已在 macOS 验证；Linux 与 Windows 尚未完成平台验证。

在业务仓库目录执行一次：

```sh
curl -fsSL https://raw.githubusercontent.com/Mou652/commit-policy/main/install.sh | sh -s -- "$PWD"
```

也可以先查看源码后执行：

```sh
git clone https://github.com/Mou652/commit-policy.git
node commit-policy/scripts/install.mjs /path/to/business-project
```

脚本自动安装锁定版本的检查工具，生成业务仓库 `lefthook.yml`、仅本机使用的 `lefthook-local.yml`，配置 IDEA 所需的 Node 路径并安装 `pre-commit`、`commit-msg`。已有不同的 Lefthook 配置、非 Lefthook Hook 或 `core.hooksPath` 时停止，保留现有配置。

接入不会执行 `git add`、`git commit` 或 `git push`。团队正式采用时，由项目维护者自行把 `lefthook.yml` 提交到业务仓库。每个开发者、每个新 clone 的业务仓库仍需执行一次接入命令；这一步用于安装本地 Hook，Git 不会把 `.git/hooks` 随 clone 分发。

## 已启用规则

规则集中配置在 [`rules/policy.json`](rules/policy.json)。

| 检查 | 当前规则 |
| --- | --- |
| 提交类型 | feat、fix、refactor、perf、docs、test、chore、build、ci、revert |
| 提交格式 | `<类型>: <中文简述>`，可追加 `[模块]` 和 `(#任务号)` |
| 简述 | 10 到 30 个汉字，不含英文字母，不含表情 |
| 正文 | 仅单行，不允许正文、脚注；文件末尾换行允许 |
| 提交分支 | 禁止在 `test` 分支直接提交 |
| 暂存内容 | 复用 `git diff --cached --check` 拒绝新增空白错误和冲突标记 |
| 系统文件 | 拒绝提交 `.DS_Store`、`Thumbs.db` |
| Java 源码 | 56 条 AST 规则：43 条阻断、13 条建议，覆盖命名、流程、异常、集合、并发、数值和常见错误 |

合法示例：

```text
fix: 修复重复请求以避免产生重复记录
feat: 增加请求去重以避免重复处理 [common-core] (#TASK-12)
```

模块标签为可选。不校验业务包结构和模块归属，不升级业务语言或框架版本，不自动格式化、不自动构建业务项目。Java 解析级别默认 21，可在 `rules/policy.json` 的 `staged.java.sourceVersion` 调整为 PMD 支持的版本。

常见违规会给出中文原因、修改建议和合法示例。例如：

```text
[提交检查] 已阻止本次提交

违规原因:
  1. 中文简述须含 10 到 30 个汉字，当前为 4 个

修改格式: <类型>: <中文简述>，可追加 [模块] 和 (#任务号)
合法示例: fix: 修复重复请求以避免产生重复记录
修改提交说明后重新提交，本次提交没有完成
```

空白错误和冲突标记会保留文件名、行号并显示中文修复建议。提示层不改变校验规则或错误退出码。Lefthook 的运行汇总仍可能显示英文；未知规则和环境异常保留原始诊断，避免隐藏排查线索。

分支、文件和代码检查仅针对本地暂存区，未暂存的工作区改动不会参与检查。Java 检查读取 Git 暂存快照，使用 PMD 与 Checkstyle 的 AST 分析，再按诊断起始行过滤为本次新增或修改的行；不能替代编译和代码审查。业务语义、是否说明“为什么”、合理分层、注释质量、日志内容等继续由人工或 AI 审查。

中文提交规范是本仓库的初始团队约定，不是 Conventional Commits 的通用要求。需要允许英文时，修改 `subject.requireChinese` 和 `subject.allowAsciiLetters`；支持的提交类型与长度也在同一文件配置。

## 怎样扩展规则与中文提示

校验参数和提示文案分别维护：

| 要改什么 | 修改位置 |
| --- | --- |
| 字数、允许类型、禁止分支等既有参数 | `rules/policy.json` |
| 中文原因、修复建议、输出标题与 Git 诊断翻译 | `rules/messages.zh-CN.json` |
| 新的提交说明校验逻辑及其启用配置 | `commitlint.config.cjs` 的本地插件与 `rules` |
| 新的非 Java 暂存区校验逻辑 | `scripts/check.mjs` |
| Java 规则、参数、等级与中文原因 | `rules/java.json`，复用规则通常只增加一个条目 |
| Java 工具版本、下载地址和校验值 | `rules/java-tools.json` |
| 证明新规则及其提示有效的测试 | `tests/policy.test.mjs`、`tests/java.test.mjs` |

文案通过参数占位符读取规则配置，例如：

```json
"commit.subject-chinese-length": "中文简述须含 {{commit.subject.minChineseCharacters}} 到 {{commit.subject.maxChineseCharacters}} 个汉字，当前为 {{count}} 个"
```

规则调用 `message('commit.subject-chinese-length', {count})` 生成诊断。改字数范围只需修改 `policy.json`，提示自动使用新范围。缺少文案或模板参数会报告配置错误，避免生成含糊或错误的提示。

新的自定义 commitlint 规则按照官方插件接口返回 `[是否通过, 中文原因]`，原因可通过 `message()` 读取文案模板，也可以由复用的插件直接提供。统一格式化器直接显示该原因，无需为每条自定义规则增加翻译映射。

复用英文提示的 commitlint 内置规则时，在文案文件增加 `commitlint.<规则名>` 条目，按稳定规则名选取中文提示；不匹配英文句子的全文。Git 原生诊断在同一文件的 `git` 节点维护。未知的第三方原因保留原文。

这套方式复用 commitlint 的校验和插件机制，不添加新的规则执行框架或翻译依赖。新的判断逻辑仍需实现和测试，不能仅靠添加中文文案形成拦截。

## Java 规则怎样使用与扩展

完整清单见 [Java 规则目录](docs/java-rules.md)，选型依据见 [开源工具对比](docs/java-tool-selection.md)。规则参考阿里 Java 开发手册的可自动检测条目，并复用现代 PMD / Checkstyle；**不等于完整覆盖阿里手册，也不是原 P3C 检查器**。

默认阻断包括：命名不规范、控制语句缺大括号、错误的字符串/空值比较、浮点字面量构造 BigDecimal、数组转集合陷阱、丢失异常 cause、空 catch、finally 返回或抛出异常、危险的传统线程池工厂，以及控制台输出等。

捕获宽泛异常、资源生命周期、默认字符集、直接创建线程等场景需要结合上下文，默认给出建议。统一异常边界、外部管理资源可能合理，不一律阻断。

### 安装与日常执行

首次接入含已跟踪 Java 文件的仓库时，会下载官方 PMD ZIP 和 Checkstyle JAR，约 141 MiB，按固定 SHA-256 验证并缓存到 `~/.cache/commit-policy/java-tools`。后续仓库共享缓存，日常提交不重复下载。既有接入者在规则刷新后首次提交 Java 文件时自动准备；可提前运行：

```sh
# 在本地 commit-policy 规则仓库中运行
npm run java:prepare
npm run java:check -- /path/to/business-project
npm run java:audit -- /path/to/business-project
npm run java:audit -- --json /path/to/business-project > /tmp/java-audit.json
```

`java:check` 只报告本次增量问题；`java:audit` 检查暂存索引里的全部生产 Java 文件，适合整理历史问题，未跟踪文件不参与。发现阻断项返回 1，只有建议时返回 0；追加 `--strict` 可将建议升级为阻断。以上命令不创建业务提交，也不修改业务文件。

JDK 寻找顺序：显式 `COMMIT_POLICY_JAVA_HOME`，否则尝试 `JAVA_HOME`、macOS 已安装的 JDK 21+ 和 PATH 中的 java。指定路径失效时停止，不自动安装 JDK。可设置 `COMMIT_POLICY_TOOL_CACHE` 更换缓存目录。工具版本通过规则仓库维护，不跟随上游自动升级；下载失败、校验失败、解析失败都会中止检查。

### 增量范围与限制

- 默认排除 `src/test`、`target`、`build`、`generated-sources`，参数在 `rules/policy.json`。
- 普通提交只扫描暂存的新增/修改 Java 文件，分析源自索引，未暂存的编辑不影响结果。重命名按新增文件检查。
- 为避免一次性阻断历史问题，只保留诊断**起始行**位于本次新增/修改行的结果。跨行表达式、类级诊断和仅删除代码的变化可能漏检；需要全量覆盖时运行 `java:audit`。
- 不构建业务、不加载 Maven/Gradle 的依赖类路径；可解析 JDK 类型，缺少外部类型信息时，一些类型或跨文件分析可能漏报。检查通过不等于编译通过。
- 暂不统一缩进宽度、行长度、Javadoc、包架构、复杂度阈值等容易与现有项目冲突的规则。
- `staged.java.enabled=false` 关闭 AST 检查并保留旧版新增行基础匹配；`rejectConsoleDebugCalls` 与 `rejectSwagger2Imports` 仍控制对应旧规则。建议保留 AST，避免基础匹配对注释和文本块的误报。

### 新规则只增加声明

例如复用 PMD 内置规则：

```json
{
  "engine": "pmd",
  "name": "EqualsNull",
  "ref": "category/java/errorprone.xml/EqualsNull",
  "level": "error",
  "category": "空值",
  "message": "判断 null 使用 == null 或 != null，不调用 equals(null)"
}
```

将条目加入 `rules/java.json`；修改等级用 `error`、`warning` 或 `off`。`properties` 保存上游规则参数。Checkstyle 复用 TreeWalker 下的检查时填写 `engine`、`name`、等级与中文原因。中文通过稳定的规则标识读取，不解析或翻译英文报错，也不需要给格式化器增加 if/else。

未有合适内置规则时，可用 PMD 的 `xpath` 扩展；当前已实现传统 Executors 工厂、直接创建 Thread、Timer 和基本类型数组传给 Arrays.asList 四条。Java 21 虚拟线程工厂没有被传统线程池规则禁止。更复杂的流程/类型分析仍需开发规则并补正反例测试；Checkstyle 的非 TreeWalker 模块需要先扩展配置生成器。

空 catch 允许写明忽略原因；FallThrough 允许上游支持的意图注释。例外仍需审查，不用批量抑制隐藏问题。更改目录后同步清单与测试，通过后推送规则仓库即可分发。

## 规则怎样更新

业务仓库保存：

```yaml
remotes:
  - git_url: https://github.com/Mou652/commit-policy.git
    ref: main
    configs:
      - lefthook.yml
    refetch_frequency: always
```

你修改规则并推送 `main`，同事后续执行 Hook 时 Lefthook 自动刷新远程仓库。既有检查的配置和脚本更新无需重新安装；依赖锁文件变化时检查脚本自动安装匹配版本的 commitlint 及其依赖。Java 分析器按工具清单自动准备对应版本；本次新增 Java 检查继续使用已有 `pre-commit`，无需重装 Hook。工具下载或校验器启动失败会中止检查。

Lefthook 执行器使用首次接入时安装的版本，升级执行器需要重新执行接入命令。这与规则自动刷新是两个更新过程。

`always` 会在每次 Hook 执行时访问 GitHub，也会增加网络等待。可改为 `30m` 或 `24h`，届时规则按间隔更新。新增 Hook 类型、切换规则仓库或接入脚本的本地启动逻辑变化，需要重新执行接入命令。

Lefthook 原生远程刷新失败时会沿用旧缓存；没有缓存时会忽略远程配置。接入脚本会检查首次加载结果，失败时不会报告接入成功。断网不能保证使用最新规则；本项目不是不可绕过的强制管控，本地 Git Hook 可被用户跳过或移除。

IDEA 需要启用 **Run Git hooks**。接入脚本生成本地可执行路径配置，避免 GUI 的 PATH 与终端不同。接入后的公开规则检查可直接运行而不产生提交：

```sh
sh "$(git rev-parse --git-path hooks/pre-commit)"
printf '%s\n' 'fix: 修复重复请求以避免产生重复记录' > /tmp/commit-policy-message.txt
sh "$(git rev-parse --git-path hooks/commit-msg)" /tmp/commit-policy-message.txt
```

## 维护与验证

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

测试使用一次性临时 Git 仓库、直接调用检查器；增量回归测试在临时仓库创建基线提交，用完清理，不操作业务仓库的提交。修改版本时同时更新 `package.json` 和 `package-lock.json`，验证通过后再发布。

公开仓库只保存通用规则与脚本。接入不向 GitHub 上传业务代码，业务仓库自身的 origin、GitLab 权限和 Maven 配置不作修改。

## 上游与许可证

- [Lefthook](https://github.com/evilmartians/lefthook)：Git Hook 执行和远程配置，MIT
- [commitlint](https://github.com/conventional-changelog/commitlint)：提交说明解析、基础规则和插件，MIT
- [PMD](https://github.com/pmd/pmd)：源码缺陷与最佳实践检查，BSD-style
- [Checkstyle](https://github.com/checkstyle/checkstyle)：命名、声明与控制语句检查，LGPL-2.1
- [Alibaba P3C](https://github.com/alibaba/p3c)：阿里规范参考，Apache-2.0；未复制其检查器实现
- [Git diff --check](https://git-scm.com/docs/git-diff)：原生暂存区空白与冲突标记检查

本仓库使用 MIT 许可证。上游工具使用锁定版本的 npm 包或官方发布制品，保留上游许可证，不修改上游源码。规则目录与适配脚本使用本仓库 MIT 许可证。
