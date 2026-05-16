# Rule Maintenance

This project uses a split rule system. Do not add every new rule to root `CLAUDE.md`.

中文备注：本项目使用拆分规则体系。不要把所有新增规则都塞进根 `CLAUDE.md`。

## When the user gives a new long-term rule

If the user says a behavior, interaction, UI pattern, workflow, validation requirement, or coding constraint should become a project rule, first classify it before editing rule files.

中文备注：如果用户说某个行为、交互、UI 模式、流程、验证要求或编码限制以后都要遵守，先判断它属于哪类规则，再决定放哪里。

## Rule Placement

- Root `CLAUDE.md`: only project identity, highest-priority principles, and rule file index.
  - 中文备注：根文件只放项目定位、最高优先级原则和规则索引。

- `00-project-defaults.md`: response style, judgment style, uncertainty handling, confidence score, business/context questioning.
  - 中文备注：回答风格、判断方式、不确定性、可信度、业务问题先问背景，放这里。

- `10-execution-scope.md`: task sizing, approval threshold, smallest safe change, completion criteria, scope control.
  - 中文备注：任务大小、什么时候先问、最小修改、完成标准、范围控制，放这里。

- `20-regression-guardrails.md`: stable behavior that must not regress, high-risk flows, adjacent validation paths.
  - 中文备注：不能回归的旧功能、高风险流程、相邻验证路径，放这里。

- `30-ui-design-system.md`: reusable UI patterns, interaction patterns, component reuse, visual consistency, global UI behavior.
  - 中文备注：可复用 UI 模式、交互模式、组件复用、视觉一致性、全局 UI 行为，放这里。

- `31-inspector-panel.md`: inspector-specific behavior for numeric fields, color fields, opacity, floating UI, computed styles.
  - 中文备注：Inspector 特有行为，比如数字字段、颜色字段、透明度、浮层、computed style，放这里。

- `40-validation-reporting.md`: validation commands, completion reports, what must be verified before finishing.
  - 中文备注：验证命令、完成报告、结束前必须检查什么，放这里。

- `50-docs-and-design-system-docs.md`: DESIGN_SYSTEM.md, Workbench, design token documentation, pending/stable component docs.
  - 中文备注：设计系统文档、Workbench、token 文档、pending/stable 组件记录，放这里。

## Classification Examples

- “This interaction should become the global standard and must not be changed casually.”
  - Put the main rule in `30-ui-design-system.md`.
  - If it protects existing behavior from regression, add a short guardrail or cross-reference in `20-regression-guardrails.md`.
  - 中文备注：全局交互规范通常放设计系统规则；如果是不能回归的稳定行为，也要在回归保护里加短规则或引用。

- “Inspector color inputs must never show rgba.”
  - Put it in `31-inspector-panel.md`.
  - 中文备注：Inspector 特有颜色行为放 Inspector 规则。

- “Every UI runtime change must run this new check.”
  - Put it in `40-validation-reporting.md`.
  - 中文备注：验证命令和完成检查放验证报告规则。

- “Do not refactor unrelated code.”
  - Put it in `10-execution-scope.md`; only add it to root `CLAUDE.md` if it is a highest-priority principle.
  - 中文备注：范围控制规则放执行范围；只有最高优先级才进根文件。

- “Document this pattern in Workbench before treating it as stable.”
  - Put it in `50-docs-and-design-system-docs.md`.
  - 中文备注：Workbench 和设计系统文档要求放文档规则。

## Update Rules

- Prefer editing an existing rule file over adding a new file.
  - 中文备注：优先更新已有规则文件，不要轻易新增文件。

- Add a new rule file only when the new rule category does not fit any existing file.
  - 中文备注：只有现有分类都不合适时，才新增规则文件。

- Keep rules concise. Do not duplicate the same rule across many files unless cross-reference is necessary.
  - 中文备注：规则要短，不要到处重复；必要时做交叉引用。

- When adding a rule, include a Chinese note explaining the intent.
  - 中文备注：新增规则时要加中文备注，方便用户理解。

- If a new rule may conflict with existing rules, state the conflict and ask the user before editing.
  - 中文备注：如果新规则可能和旧规则冲突，先说明冲突并问用户，不要直接改。

- After editing rule files, report which file was changed and why.
  - 中文备注：改完规则后，要说明改了哪个文件、为什么放那里。
