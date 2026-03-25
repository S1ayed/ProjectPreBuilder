# src/mock 说明

本目录用于提供节点语义与依赖连线的示例 JSON，便于开发、调试、联调和文档对照。

## 文件总览

- `project.node.json`：项目节点（kind: project）示例
- `directory.node.json`：目录节点（kind: directory）示例
- `file.node.json`：文件节点（kind: file）示例
- `config.node.json`：配置节点（kind: config）示例
- `rule.node.json`：规则节点（kind: rule）示例
- `dependency-link.json`：依赖连线（DependencyConnecting）示例

---

## 1. project.node.json

适用场景：

- 创建项目根节点默认语义
- 校验项目元信息是否完整
- 导出/导入时对照 project 字段

主要字段：

- `ProjectName`：项目名称
- `ProjectDescription`：项目描述
- `stack`：技术栈数组（字符串数组）

---

## 2. directory.node.json

适用场景：

- 创建目录节点默认语义
- 构建目录结构时的数据校验

主要字段：

- `DirectoryName`：目录名（如 `src`）
- `DirectoryDescription`：目录描述

---

## 3. file.node.json

适用场景：

- 文件节点语义配置
- 代码生成提示词（Prompt）结构联调
- 属性面板与导出结构对照

主要字段：

- `FileName`：文件名
- `FileType`：文件类型（如 `backend.express.route`）
- `Prompt.generation.goal`：生成目标
- `Prompt.generation.inputs`：输入参数数组
- `Prompt.generation.outputs`：输出结果数组
- `Prompt.generation.constraints`：约束条件数组

---

## 4. config.node.json

适用场景：

- 配置文件节点语义建模
- 模板化生成策略联调
- 规则引用与敏感指令处理验证

主要字段：

- `ConfigName`：配置文件名（如 `package.json`）
- `ConfigFormat`：格式（如 `json`）
- `GenerationStrategy`：生成策略
- `TemplateID`：模板标识
- `Directives`：普通生成指令对象
- `SensitiveDirectives`：敏感指令对象
- `RuleRefs`：规则节点引用数组
- `Constraints`：约束条件数组

---

## 5. rule.node.json

适用场景：

- 规则节点定义与解释器联调
- 规则作用域和强弱规则测试

主要字段：

- `id`：规则 ID
- `type`：固定为 `rule`
- `enabled`：是否启用
- `scope`：作用域（global/directory/file）
- `rule_condition`：规则强度（hard/soft）
- `content`：规则内容
- `examples`：正反例数组

---

## 6. dependency-link.json

适用场景：

- 连线结构校验
- 依赖图构建与排序调试
- 导入导出 relation/dependency 结构对照

主要字段：

- `id`：连线 ID
- `from`：起点节点 ID（依赖方）
- `to`：终点节点 ID（被依赖方）
- `type`：关系类型（如 `import`、`depends_on`、`generates`、`contains`）

---

## 使用建议

- 作为“最小可运行样例”直接拷贝到调试数据中。
- 联调导入功能时，优先从 `file.node.json` 和 `dependency-link.json` 开始。
- 扩展新节点类型时，按同命名风格新增 `<kind>.node.json`，并在本 README 补充字段说明。
