# Java 开源检查工具选型

核对日期：2026-10-01。GitHub Star 是当时 API 快照，不代表规则准确率；以下是针对本地提交检查的候选集，非穷尽排名。

| 项目 | Star 快照 | 核对版本 | 用途 | 本次决策 |
| --- | ---: | --- | --- | --- |
| [Alibaba P3C](https://github.com/alibaba/p3c) | 30,852 | p3c-pmd 2.1.1 | 阿里开发规范 | 参考规则意图，未接入旧运行器 |
| [Checkstyle](https://github.com/checkstyle/checkstyle) | 9,583 | 14.3.0 | 源码风格、命名和结构 | 已接入，使用 JDK 21+ 运行 |
| [Error Prone](https://github.com/google/error-prone) | 7,243 | 2.50.0 | 编译期缺陷检查 | 留作项目编译阶段扩展 |
| [Spotless](https://github.com/diffplug/spotless) | 5,675 | Gradle 8.10.3 | 格式化统一 | 暂不接入，先保留各项目的 IDEA 格式约定 |
| [PMD](https://github.com/pmd/pmd) | 5,495 | 7.28.0 | 源码语法树与类型分析 | 已接入，复用内置规则和 XPath |
| [SpotBugs](https://github.com/spotbugs/spotbugs) | 3,948 | 4.10.4 | 字节码缺陷检查 | 留作完成构建后的扩展 |

## 为什么选择 PMD + Checkstyle

两者均可直接分析 Java 源码，适合先检查 Git 索引快照，再按改动行过滤，不需要每次 commit 都执行完整业务构建。PMD 承担常见缺陷、集合、异常、并发检查；Checkstyle 承担命名、导入和语句结构。错误使用中文规则元数据输出，保留规则标识及文件行列便于定位。

初始版本固定为 [PMD 7.28.0](https://github.com/pmd/pmd/releases/tag/pmd_releases/7.28.0) 与 [Checkstyle 14.3.0](https://github.com/checkstyle/checkstyle/releases/tag/checkstyle-14.3.0)。下载地址与 SHA-256 在 `rules/java-tools.json`，校验值按 GitHub 发布资产 digest 核对。

## 为什么未直接使用 P3C 插件

[P3C 的 p3c-pmd POM](https://github.com/alibaba/p3c/blob/master/p3c-pmd/pom.xml) 当前依赖 PMD 6.15.0，项目实现与现代 PMD 7 API 不能直接混装。Java 21 项目需要现代语法支持，上游也有 [PMD 7 兼容讨论](https://github.com/alibaba/p3c/issues/1002)。因此本仓库复用现代工具中意图接近的规则，并补少量 XPath，而不是 fork P3C 或宣称完整复刻阿里手册。

## 后续规则扩展顺序

1. 优先从 PMD / Checkstyle 已有规则挑选能稳定判断、误报少的条目；先用生产源码只读全量报告评估。
2. 对依赖上下文的规则先设 warning，并给出正反例；确认适用范围后再决定是否 error。
3. SpotBugs 和 Error Prone 在项目接受构建耗时、明确编译链路后接入。它们不属于本次默认 Hook。
4. 安全漏洞、依赖漏洞、SQL/业务正确性、日志隐私、架构合理性需要其他检查和代码审查。当前 56 条不能证明项目完整满足所有 Java / 阿里规范。

参考接口：[PMD CLI](https://docs.pmd-code.org/latest/pmd_userdocs_cli_reference.html)、[PMD Java 规则](https://docs.pmd-code.org/latest/pmd_rules_java.html)、[Checkstyle CLI](https://checkstyle.org/cmdline.html)、[Checkstyle 检查目录](https://checkstyle.org/checks.html)。
