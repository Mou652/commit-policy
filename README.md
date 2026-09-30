# commit-policy

公开的团队本地 Git 提交规则。复用 **Lefthook 2.1.15** 执行 Hook，复用 **commitlint 21.2.3** 解析和检查提交说明。

业务仓库可以在内网 GitLab，规则仓库在 GitHub。开发者通过 HTTPS 匿名读取规则，不需要 GitHub 账号、Token 或仓库写权限。检查在开发者电脑执行。

## 快速接入

需要已有的 Git、Node.js >= 22.12.0、npm，以及访问 GitHub 和 npm 下载源的网络。首版在 macOS 验证；Linux 与 Windows 尚未完成平台验证。

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

## 首版规则

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
| Java 新增行 | 生产源文件禁止控制台调试输出、`printStackTrace` 和 Swagger2 注解 import |

合法示例：

```text
fix: 修复重复请求以避免产生重复记录
feat: 增加请求去重以避免重复处理 [common-core] (#TASK-12)
```

模块标签为可选。首版不校验包结构和模块归属，不强制语言或框架版本，不修改文件、不自动格式化、不自动构建业务项目。

分支、文件和代码检查仅针对本地暂存区，未暂存的工作区改动不会参与检查。Java 检查是新增行的确定性匹配，不能替代 AST 分析、编译或代码审查。业务语义、是否说明“为什么”、合理分层、注释质量、日志内容等继续由人工或 AI 审查。

中文提交规范是本仓库的初始团队约定，不是 Conventional Commits 的通用要求。需要允许英文时，修改 `subject.requireChinese` 和 `subject.allowAsciiLetters`；支持的提交类型与长度也在同一文件配置。

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

你修改规则并推送 `main`，同事后续执行 Hook 时 Lefthook 自动刷新远程仓库。既有检查的配置和脚本更新无需重新安装；依赖锁文件变化时检查脚本自动安装匹配版本的 commitlint 及其依赖。工具下载或校验器启动失败会中止检查。

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

测试使用一次性临时 Git 仓库，只操作临时暂存区、直接调用检查器，不创建真实提交。修改版本时同时更新 `package.json` 和 `package-lock.json`，验证通过后再发布。

公开仓库只保存通用规则与脚本。接入不向 GitHub 上传业务代码，业务仓库自身的 origin、GitLab 权限和 Maven 配置不作修改。

## 上游与许可证

- [Lefthook](https://github.com/evilmartians/lefthook)：Git Hook 执行和远程配置，MIT
- [commitlint](https://github.com/conventional-changelog/commitlint)：提交说明解析、基础规则和插件，MIT
- [Git diff --check](https://git-scm.com/docs/git-diff)：原生暂存区空白与冲突标记检查

本仓库使用 MIT 许可证。上游工具通过锁定版本的 npm 包安装，不复制或修改上游源码。
