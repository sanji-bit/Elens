# Regression Guardrails

Stable existing functionality must not regress when implementing new features or fixes.

中文备注：这是项目最重要的稳定性规则。新功能和修复不能破坏旧功能。

## High-Risk Areas

Treat these as high-risk and run adjacent checks when touched:

- inspector controls
- toolbar behavior
- changes/copy flows
- selection
- move/drag
- runtime styles
- design tokens
- overlay mounting
- extension/demo entry points
- shared interaction code
- event handling
- rendering
- persistence

中文备注：这些是 Elens 容易回归的高风险区域。只要碰到，就不能只测当前问题，还要测相邻旧流程。

## Rules

- Before editing, identify likely impacted existing flows and shared utilities/components.
  - 中文备注：编辑前先判断可能影响哪些旧流程、共享组件和工具函数。

- If a change may affect an existing feature, state which feature may be affected and why.
  - 中文备注：如果可能影响旧功能，要提前说明影响哪个功能和原因。

- Test both the requested path and adjacent existing paths that depend on the same code.
  - 中文备注：既测当前需求路径，也测依赖同一代码的相邻路径。

- If affected old functionality cannot be tested locally, state this clearly and list exactly what the user should verify.
  - 中文备注：本地测不了的，要明确告诉用户需要手动验证什么。

- Do not claim a feature is safe or fully validated unless relevant regression paths were actually tested.
  - 中文备注：没测过就不能说完全安全或已完整验证。

- If a fix intentionally changes existing behavior, explain the behavior change before or during implementation.
  - 中文备注：如果修复会改变旧行为，要提前说明，不能等用户发现。
