# Java 规则目录

规则源：[`rules/java.json`](../rules/java.json)。当前 56 条：43 条 error（阻断）、13 条 warning（建议）。普通 Hook 按诊断起始行过滤本次改动；`--all` 检查全部已跟踪生产 Java 文件，`--strict` 将建议升级为阻断。

“阿里参考”标注的是规范主题，不承诺与 P3C 检查器逐条等价；空白项为通用 Java 实践或本仓库已有团队约定。PMD 规则按 7.28.0 固定，Checkstyle 按 14.3.0 固定。详细边界见 [README](../README.md#增量范围与限制)。

| 类别 | 等级 | 工具 / 规则 | 中文原因与建议 | 阿里参考 |
| --- | --- | --- | --- | --- |
| 命名 | error | checkstyle / [TypeName](https://checkstyle.org/checks.html) | 类型名使用大驼峰，例如 OrderService | 命名风格 |
| 命名 | error | checkstyle / [MethodName](https://checkstyle.org/checks.html) | 方法名使用小驼峰，例如 createOrder | 命名风格 |
| 命名 | error | checkstyle / [MemberName](https://checkstyle.org/checks.html) | 实例字段名使用小驼峰，例如 orderId | 命名风格 |
| 命名 | error | checkstyle / [ParameterName](https://checkstyle.org/checks.html) | 参数名使用小驼峰，例如 userId | 命名风格 |
| 命名 | error | checkstyle / [LocalVariableName](https://checkstyle.org/checks.html) | 局部变量名使用小驼峰 | 命名风格 |
| 命名 | error | checkstyle / [StaticVariableName](https://checkstyle.org/checks.html) | 非 final 静态字段使用小驼峰 | 命名风格 |
| 命名 | error | checkstyle / [ConstantName](https://checkstyle.org/checks.html) | 常量名使用大写字母和下划线，例如 MAX_RETRY_COUNT | 常量定义 |
| 命名 | error | checkstyle / [PackageName](https://checkstyle.org/checks.html) | 包名使用小写字母与数字 | 命名风格 |
| 流程 | error | checkstyle / [NeedBraces](https://checkstyle.org/checks.html) | if、else、for、while、do 的代码块必须加大括号 | 控制语句 |
| 导入 | error | checkstyle / [AvoidStarImport](https://checkstyle.org/checks.html) | 显式导入实际使用的类型或成员，禁止星号导入 | — |
| 导入 | error | checkstyle / [RedundantImport](https://checkstyle.org/checks.html) | 删除重复导入、同包导入或不必要的 java.lang 导入 | — |
| 兼容性 | error | checkstyle / [IllegalImport](https://checkstyle.org/checks.html) | 禁止新增 Swagger2 注解 import，使用 OpenAPI3 | — |
| 导入 | error | checkstyle / [UnusedImports](https://checkstyle.org/checks.html) | 删除未使用的 import | — |
| 声明 | error | checkstyle / [ModifierOrder](https://checkstyle.org/checks.html) | 按 Java 约定排列修饰符，例如 public static final | — |
| 声明 | error | checkstyle / [OneStatementPerLine](https://checkstyle.org/checks.html) | 一行只写一条语句，请分行书写 | 代码格式 |
| 声明 | error | checkstyle / [MultipleVariableDeclarations](https://checkstyle.org/checks.html) | 每条声明只定义一个变量 | 代码格式 |
| 声明 | error | checkstyle / [ArrayTypeStyle](https://checkstyle.org/checks.html) | 数组中括号放在类型后，例如 String[] args | 代码格式 |
| 数值 | error | checkstyle / [UpperEll](https://checkstyle.org/checks.html) | long 字面量使用大写 L，避免与数字 1 混淆 | 常量定义 |
| 流程 | error | checkstyle / [EmptyStatement](https://checkstyle.org/checks.html) | 删除独立分号或循环后多余分号形成的空语句 | — |
| 流程 | error | checkstyle / [FallThrough](https://checkstyle.org/checks.html) | switch 分支应明确终止；有意贯穿时按工具要求注明 fall through | 控制语句 |
| 数值 | error | pmd / [AvoidDecimalLiteralsInBigDecimalConstructor](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | BigDecimal 不要直接接收浮点字面量，使用字符串或 valueOf 避免精度误差 | 数值精度 |
| 比较 | error | pmd / [UseEqualsToCompareStrings](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 字符串内容使用 equals 比较，禁止用 == 或 != 判断内容 | 对象比较 |
| 空值 | error | pmd / [BrokenNullCheck](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 修正空值判断的短路运算符，避免判断后仍解引用 null | — |
| 空值 | error | pmd / [EqualsNull](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 判断 null 使用 == null 或 != null，不调用 equals(null) | — |
| 数值 | error | pmd / [ComparisonWithNaN](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 判断 NaN 使用 Float.isNaN 或 Double.isNaN | — |
| 集合 | error | pmd / [ClassCastExceptionWithToArray](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 使用带类型参数的 toArray，避免将 Object[] 强转为具体类型数组 | 集合处理 |
| 集合 | error | pmd / [CollectionTypeMismatch](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 集合查找或删除的参数类型必须与元素或键类型匹配 | — |
| 集合 | error | pmd / [ConfusingArgumentToVarargsMethod](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 可变参数传入数组或 null 时，显式说明作为数组还是单个元素 | — |
| 集合 | error | pmd / [AlibabaAvoidPrimitiveArrayAsList](../rules/java.json) | Arrays.asList 不会把基本类型数组展开成元素列表，请使用包装类型数组或显式转换 | 数组转集合 |
| 异常 | error | pmd / [DoNotThrowExceptionInFinally](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | finally 中不要抛出新异常，以免覆盖原始异常 | 异常处理 |
| 异常 | error | pmd / [ReturnFromFinallyBlock](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | finally 中禁止 return，避免吞掉异常或覆盖返回值 | 异常处理 |
| 对象契约 | error | pmd / [OverrideBothEqualsAndHashcode](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 重写 equals 时同时重写 hashCode，保持集合行为一致 | 对象方法 |
| 异常 | error | pmd / [PreserveStackTrace](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/bestpractices.xml) | 转换异常时传入原始异常作为 cause，保留排查线索 | 异常处理 |
| 异常 | error | pmd / [EmptyCatchBlock](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | catch 不能静默吞异常；确需忽略时写明原因 | 异常处理 |
| 日志 | error | pmd / [AvoidPrintStackTrace](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/bestpractices.xml) | 使用日志框架记录异常，禁止调用 printStackTrace | 日志规约 |
| 日志 | error | pmd / [SystemPrintln](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/bestpractices.xml) | 生产代码使用日志框架，禁止 System.out 和 System.err 调试输出 | 日志规约 |
| 运行时 | error | pmd / [DoNotCallGarbageCollectionExplicitly](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 禁止业务代码主动调用 System.gc 或 Runtime.gc | — |
| 可维护性 | error | pmd / [UnusedLocalVariable](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/bestpractices.xml) | 删除未使用的局部变量或完成其业务用途 | — |
| 集合 | error | pmd / [DoubleBraceInitialization](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/bestpractices.xml) | 避免双大括号初始化集合，防止引入匿名内部类和外部引用 | 集合处理 |
| 并发 | error | pmd / [DontCallThreadRun](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/multithreading.xml) | 不要直接调用 Thread.run 启动线程，应使用 start 或提交给执行器 | — |
| 并发 | error | pmd / [DoubleCheckedLocking](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/multithreading.xml) | 修复不安全的双重检查锁定，正确使用 volatile 或安全初始化机制 | 并发处理 |
| 并发 | error | pmd / [UnsynchronizedStaticFormatter](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/multithreading.xml) | 共享静态日期格式化器需要线程安全，优先使用 DateTimeFormatter | 并发处理 |
| 并发 | error | pmd / [AlibabaAvoidExecutorsFactory](../rules/java.json) | 避免 Executors 的传统快捷线程池工厂，显式设置有界队列、线程数及拒绝策略 | 线程池创建 |
| 并发 | warning | pmd / [AlibabaAvoidNewThread](../rules/java.json) | 优先使用受管理的线程池；直接创建 Thread 时复核线程命名和生命周期 | 线程管理 |
| 并发 | warning | pmd / [AlibabaAvoidTimer](../rules/java.json) | 优先使用 ScheduledExecutorService，避免 Timer 单线程任务相互影响 | 定时任务 |
| 异常 | warning | pmd / [AvoidCatchingGenericException](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 优先捕获明确异常类型；统一异常边界可结合场景保留 | 异常处理 |
| 资源 | warning | pmd / [CloseResource](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 检查资源释放，优先使用 try-with-resources；外部托管资源需确认生命周期 | 资源关闭 |
| 编码 | warning | pmd / [RelianceOnDefaultCharset](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/bestpractices.xml) | 读写字节或文本时显式指定字符集，避免依赖运行环境默认值 | — |
| 编码 | warning | pmd / [UseStandardCharsets](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/bestpractices.xml) | 使用 StandardCharsets 常量表达标准字符集 | — |
| 集合 | warning | pmd / [UseCollectionIsEmpty](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/bestpractices.xml) | 集合判空优先使用 isEmpty，表达意图更清楚 | — |
| 并发 | warning | pmd / [UseNotifyAllInsteadOfNotify](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/multithreading.xml) | 复核 notify 是否可能遗漏等待线程，必要时使用 notifyAll | — |
| 并发 | warning | pmd / [AvoidThreadGroup](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/multithreading.xml) | 避免依赖 ThreadGroup 管理业务线程，优先使用执行器 | — |
| 性能 | warning | pmd / [StringInstantiation](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/performance.xml) | 避免 new String 创建不必要的字符串对象 | — |
| 性能 | warning | pmd / [BigIntegerInstantiation](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/performance.xml) | 常用 BigInteger 或 BigDecimal 值优先使用现成常量 | — |
| 运行时 | warning | pmd / [DoNotTerminateVM](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 复核 System.exit 或 Runtime.exit，业务组件不应随意终止整个进程 | — |
| 兼容性 | warning | pmd / [UnsupportedJdkApiUsage](https://github.com/pmd/pmd/blob/pmd_releases/7.28.0/pmd-java/src/main/resources/category/java/errorprone.xml) | 避免依赖不受支持的 JDK 内部 API，优先使用公开标准接口 | — |
