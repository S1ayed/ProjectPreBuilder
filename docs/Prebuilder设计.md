# PreBuilder 设计

## 1. 项目目标

ProjectPreBuilder 是一个单向建模系统。用户在 Web UI 中通过拖拽和连线绘制项目结构，再由解释器将画布模型转换为 JSON，使 LLM 能够按该 JSON 描述自动构建项目。

## 2. 核心建模概念

### 2.1 节点（Node）

节点表示项目中的实体（项目、目录、文件、配置文件）。每个节点有两层属性：

- 几何层：位置、尺寸、形状、样式。
- 语义层：业务字段（如 ProjectName、FileType、Prompt）。

### 2.2 连线（Edge）

带箭头连线表示依赖关系 `DependencyConnecting`，是有方向的关系：

- `from`：依赖方。
- `to`：被依赖方。
- `type`：关系类型（如 `import`、`compose`、`generate-from`）。

## 3. 图形语义定义

| 图形 | 节点语义 | 说明 |
| --- | --- | --- |
| 菱形 | `project` | 项目根节点。新建 prebuilder 文件时自动创建。 |
| 平行四边形 | `directory` | 目录节点。初始化时默认创建 `src`。 |
| 矩形 | `file` | 代码源文件节点（如 `.py`、`.js`、`.c`）。 |
| 圆形 | `config` | 配置文件节点（如 `.gitignore`、`package.json`）。 |

## 4. 节点语义注册表（Kind Registry）

为避免将语义写死在组件中，系统应维护统一的 Kind 注册表。每个 kind 负责定义：

- 节点名称与显示名。
- 默认图形外观。
- 字段 schema（必填项、类型、默认值）。
- 字段校验规则。
- 导出 JSON 时的映射逻辑。

### 4.1 注册表结构（建议）

```json
{
  "kindRegistry": {
    "project": {
      "displayName": "项目",
      "shape": "diamond",
      "requiredFields": ["ProjectName", "ProjectDescription", "stack"],
      "schema": {
        "ProjectName": { "type": "string", "minLength": 1 },
        "ProjectDescription": { "type": "string", "default": "" },
        "stack": { "type": "string[]", "default": [] }
      }
    },
    "directory": {
      "displayName": "目录",
      "shape": "parallelogram",
      "requiredFields": ["DirectoryName"],
      "schema": {
        "DirectoryName": { "type": "string", "minLength": 1 },
        "DirectoryDescription": { "type": "string", "default": "" }
      }
    },
    "file": {
      "displayName": "文件",
      "shape": "rect",
      "requiredFields": ["FileName", "FileType", "Prompt"],
      "schema": {
        "FileName": { "type": "string", "minLength": 1 },
        "FileType": { "type": "string", "minLength": 1 },
        "Prompt": { "type": "object" }
      }
    },
    "config": {
      "displayName": "配置文件",
      "shape": "circle",
      "requiredFields": ["ConfigName", "ConfigFormat"],
      "schema": {
        "ConfigName": { "type": "string", "minLength": 1 },
        "ConfigFormat": { "type": "string", "enum": ["json", "yaml", "toml", "text"] },
        "GenerationStrategy": { "type": "string", "default": "template-driven" },
        "TemplateID": { "type": "string", "default": "" },
        "Directives": { "type": "object", "default": {} },
        "SensitiveDirectives": { "type": "object", "default": {} },
        "RuleRefs": { "type": "string[]", "default": [] },
        "Constraints": { "type": "string[]", "default": [] }
      }
    }
  }
}
```

### 4.2 kind: `project`

- 语义：项目根节点。
- 初始化：每个新文档创建 1 个。
- 必填字段：
  - `ProjectName`
  - `ProjectDescription`
  - `stack`（字符串数组）

示例：

```json
{
  "ProjectName": "my-app",
  "ProjectDescription": "一个用于演示的前后端项目",
  "stack": ["react", "vite", "node.js"]
}
```

### 4.3 kind: `directory`

- 语义：目录。
- 初始化：默认创建 `src`。
- 必填字段：
  - `DirectoryName`
  - `DirectoryDescription`（可空字符串）

示例：

```json
{
  "DirectoryName": "src",
  "DirectoryDescription": "核心源码目录"
}
```

### 4.4 kind: `file`

- 语义：代码源文件。
- 必填字段：
  - `FileName`
  - `FileType`
  - `Prompt`

`Prompt` 建议为结构化对象：

```json
{
  "generation": {
    "goal": "实现用户登录接口",
    "inputs": ["username", "password"],
    "outputs": ["token"],
    "constraints": ["use express", "use jwt"]
  }
}
```

示例：

```json
{
  "FileName": "auth.route.js",
  "FileType": "backend.express.route",
  "Prompt": {
    "generation": {
      "goal": "实现用户登录接口",
      "inputs": ["username", "password"],
      "outputs": ["token"],
      "constraints": ["use express", "use jwt"]
    }
  }
}
```

### 4.5 kind: `config`

- 语义：配置文件。
- 必填字段：
  - `ConfigName`
  - `ConfigFormat`
- 建议字段：
  - `Directives`：普通生成指令。
  - `SensitiveDirectives`：敏感指令（如依赖变更、密钥占位、外部源接入等高风险动作）。
  - `RuleRefs`：关联的 Rule 节点 ID 列表，用于与 Rule 节点联动。

示例：

```json
{
  "ConfigName": "package.json",
  "ConfigFormat": "json",
  "GenerationStrategy": "template-driven",
  "TemplateID": "nodejs-backend-standard",
  "Directives": {
    "includeDependencies": ["express", "dotenv"],
    "scripts": {
      "start": "node index.js",
      "dev": "nodemon index.js"
    }
  },
  "SensitiveDirectives": {
    "dependencyChangesRequireApproval": true,
    "secretPlaceholders": ["API_KEY", "JWT_SECRET"]
  },
  "RuleRefs": ["rule_1"],
  "Constraints": ["Must use ES Modules", "Version should be 1.0.0"]
}
```

字段说明：

- `Directives`：用于表达常规生成要求。
- `SensitiveDirectives`：用于表达需要额外审慎处理的高风险要求。
- `RuleRefs`：用于显式声明当前 Config 节点受哪些 Rule 约束。

### 4.6 kind: `rule`

- 语义：规则节点，用于约束 LLM 在构建当前 Project 时的行为边界。
- 作用：定义必须遵守（hard）或建议遵守（soft）的用户规则。
- 作用域判定：由 Rule 节点连接到的对象决定。
  - 连接到 `project` 节点：`scope = global`
  - 连接到 `directory` 节点：`scope = directory`
  - 连接到 `file` 节点：`scope = file`

建议结构(以下仅为示例)：

```json
{
  "id": "rule_1",
  "type": "rule",
  "enabled": true,
  "scope": "global | directory | file",
  "rule_condition": "hard | soft",
  "content": "禁止在未授权情况下引入第三方库",
  "examples": [
    "正例：在新增第三方依赖前先通知用户并获得授权。",
    "反例：未告知用户直接安装并使用第三方库。"
  ]
}
```

字段说明：

- `enabled`：是否启用规则。
- `rule_condition`：
  - `hard`：规则绝对不能被违反。
  - `soft`：若发生违反规则情况，通知用户并询问是否禁止该行为。
- `content`：规则内容文本。
- `examples`：一到两个正反例，用于减少 LLM 对规则的误解。

## 5. 依赖连线（DependencyConnecting）规范

推荐结构：

```json
{
  "id": "connection-0",
  "from": "shape-file-login-route",
  "to": "shape-file-auth-service",
  "type": "import"
}
```

说明：

- 连线为有向边，`from -> to`。
- 在解释器中可用于构建依赖图，支持后续排序、校验和生成。
- type是可选的，包含import、depends_on、generates、contains等关系

## 6. 初始化约束

- 新建文档时必须自动生成：
  - 1 个 `project` 节点。
  - 1 个 `directory` 节点（命名为`src`）。
- 初始化后可允许用户继续添加 `file` 与 `config` 节点。

## 7. 导出目标

解释器的输出 JSON 至少包含三部分：

- `nodes`：节点语义数据。
- `dependencies`：有向依赖关系。
- `meta`：文档版本、创建时间、工具版本。

该JSON结构将作为 LLM 构建项目的输入契约。
