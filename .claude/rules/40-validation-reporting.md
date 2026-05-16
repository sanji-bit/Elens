# Validation and Reporting

## UI Validation

For UI changes, run by default:

```bash
npx tsc --noEmit
npx vite build --outDir demo-dist
npm run check:design-system
```

中文备注：UI runtime 改动默认跑类型检查、构建、设计系统检查。

- If `check:design-system` reports warnings, inspect them before finishing. Fix clear violations instead of ignoring them.
  - 中文备注：设计系统检查有 warning 要看原因，明确违规要修。

- For trivial non-runtime changes, documentation-only changes, or changes that clearly cannot affect build/runtime behavior, state why full validation was not run and run the relevant narrower check if available.
  - 中文备注：纯文档或明显不影响运行的改动，可以说明原因后不跑完整验证。

## Completion Report For UI Changes

Report concisely:

- what changed
- which existing design system components or patterns were reused
- whether any new visual pattern was introduced
- whether the Workbench stable area or pending registry was updated
- if a new pending component was added: closest stable component, why it could not be reused, review status, last reviewed date, and proposed review decision
- which validation commands were run
- what was not verified and what the user should confirm

中文备注：完成报告要短，但必须说明改了什么、复用了什么、测了什么、没测什么。

## Final Summary

- End tasks with a concise summary of what changed, what was verified, and what remains unverified or pending.
  - 中文备注：任务结束时简短总结改了什么、验证了什么、还有什么没做或没确认。
