# Elens Design System Enforcement

## Core Rule

All UI work in this project must follow the Elens Design System.

Before implementing or modifying UI, first check the existing Workbench and existing `.ei-*` / `.ei-dp-*` component patterns. Reuse existing components, tokens, class patterns, and interaction states whenever possible.

Do not create new visual styles just to complete a local feature. If an existing component is not enough, explain why and decide whether to extend an existing component or add a pending component to the Workbench.

## Required AI Workflow For UI Tasks

For every UI-related task:

1. Identify whether the task affects UI, visual style, interaction state, layout, or component behavior.
2. If yes, inspect existing Elens Design System patterns before editing code.
3. Reuse existing components and styles first.
4. If reuse is not possible, state:
   - which existing component is closest
   - why it cannot be reused directly
   - whether the solution is an extension, a new pending component, or a one-off layout detail
5. Do not invent new colors, border radii, shadows, spacing systems, dropdown styles, input styles, color picker styles, panel styles, or button styles unless explicitly justified.
6. If a new reusable UI pattern is introduced, add it to the Workbench pending component area before treating it as a stable component.
7. Every new pending component entry must include:
   - the closest stable component
   - why the stable component cannot be reused directly
   - review status
   - last reviewed date
   - proposed review decision
8. New components must inherit existing theme constraints, tokens, CSS variables, and shared interaction patterns instead of creating an independent visual system.

## Must Reuse

These patterns are established design system components and must be reused:

- Color picker
- Input fields
- Dropdown/select
- Segmented input groups
- Panel/popover
- Tabs
- Buttons
- Menu items
- Tooltip
- Annotation input

## Hard Rules

- All color selection must use the shared color picker.
- Do not use native `input[type=color]` outside the shared color picker implementation.
- Dropdowns must use the existing dropdown style and arrow icon.
- Inputs must follow the existing default / hover / focus behavior.
- Segmented inputs should use a connected segment group instead of unrelated standalone fields.
- New `.ei-*` or `.ei-dp-*` component classes must be justified.
- Avoid hardcoded visual values when an existing token, CSS variable, or component pattern can be used.
- Workbench samples must use real runtime classes and real component structure, not fake mock components.
- `DESIGN_SYSTEM.md` component specifications must be token-first: stable UI colors, sizes, spacing, radii, shadows, borders, z-indexes, and motion values must use tokens or CSS variables as the primary value.
- Token definition sections may include concrete values because they are the source of truth; component specification sections must not use raw `px`, hex, `rgb/rgba`, named colors, or duration values as the primary spec.
- When changing stable UI tokens, component dimensions, color, radius, shadow, border, spacing, or interaction states, update `DESIGN_SYSTEM.md` and the matching Workbench sample or explicitly explain why they remain valid.
- New stable UI tokens must be added to `src/design-tokens.ts` and exposed through `generateCSSVariables()` before documentation or component specs reference them.
- Do not invent local one-off CSS variables or raw values to bypass the design system; if a reusable value is missing, add or propose a semantic token first.

## Required Completion Report For UI Changes

When finishing a UI-related task, report:

- Which existing design system components or patterns were reused
- Whether any new visual pattern was introduced
- Whether the Workbench stable area or pending registry was updated
- If a new pending component was added: closest stable component, why it could not be reused, review status, last reviewed date, and proposed review decision
- Which validation commands were run

## Validation

For UI changes, run:

```bash
npx tsc --noEmit
npx vite build --outDir demo-dist
npm run check:design-system
```

If `check:design-system` reports warnings, inspect them before finishing. Fix clear violations instead of ignoring them.
