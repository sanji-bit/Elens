# Execution Scope

## Task Sizing

- Small task: localized change, low ambiguity, one or few files, direct validation possible.
  - 中文备注：小任务通常是局部改动，影响范围小，能快速验证。

- Medium task: touches shared components/utilities or behavior used by multiple flows.
  - 中文备注：中任务会影响共享组件、工具函数或多个流程。

- Large task: broad exploration, architecture change, multi-agent planning, full regression testing, or likely over 10 minutes.
  - 中文备注：大任务需要大范围探索、架构变更、完整回归或超过约 10 分钟。

## Scope Rules

- Think before coding. Identify task type, affected area, and likely regression risk before editing.
  - 中文备注：编码前先判断任务类型、影响范围和风险。

- Define completion criteria before implementation.
  - 中文备注：开始前明确完成标准，防止无限扩展。

- For small changes, do not over-plan. Read the minimum necessary code and implement directly.
  - 中文备注：小改动不要过度规划，读够必要代码后直接做。

- Use the smallest safe change. Prefer the narrowest diff that fully solves the requested problem.
  - 中文备注：最小安全修改，解决问题即可。

- Only fix the requested problem. Do not refactor, restyle, rewrite, or improve unrelated code unless necessary.
  - 中文备注：只改指定问题，不顺手优化无关代码。

- For medium changes, identify impacted flows before editing and validate adjacent behavior.
  - 中文备注：中等改动要先识别受影响旧流程，并验证相邻路径。

- For large changes, explain scope, risk, expected cost, and faster alternatives; wait for user approval.
  - 中文备注：大任务先说明范围、风险、成本和快方案，等用户确认。

- When both a fast path and a safer path are reasonable, present both with cost/risk and let the user choose.
  - 中文备注：快方案和稳方案都可行时，让用户选择。

## Execution Communication

- Before the first file read or command, briefly state what you are about to inspect or run.
  - 中文备注：第一次读文件或跑命令前，先用一句话说明要做什么。

- During execution, provide short progress updates when a cause is found, direction changes, or a blocker appears.
  - 中文备注：发现原因、改变方向、遇到阻塞时，用一句话同步，不要长时间沉默。

- If the user says “停一下，汇报进度” or asks for progress, pause task expansion and report current state, findings, blockers, and next step.
  - 中文备注：如果我说“停一下，汇报进度”，先暂停继续扩展任务，汇报当前状态、发现、阻塞和下一步。

- For long-running commands such as tests, builds, or dev servers, prefer background execution when appropriate and avoid meaningless sleep or polling loops.
  - 中文备注：测试、构建、dev server 这类长命令适合时后台跑，不要反复无意义等待。

## Safety Boundaries

- Ask before destructive or externally visible actions, including deleting files, reset, force push, CI/CD changes, opening PRs/issues, or changing shared systems.
  - 中文备注：删除文件、reset、force push、改 CI/CD、发 PR/issue、影响共享系统前必须先问。

- Do not bypass safety checks casually. Do not use `--no-verify` or skip hooks unless the user explicitly approves and the reason is documented.
  - 中文备注：不要随便跳过 hooks 或安全检查；确实要跳过必须你明确同意，并说明原因。

- Protect user work. If there are existing uncommitted changes, unfamiliar files, or changes not made by the current task, do not overwrite, delete, or reformat them without approval.
  - 中文备注：保护用户已有改动。遇到未提交改动或不认识的文件，不能擅自覆盖、删除、格式化。
