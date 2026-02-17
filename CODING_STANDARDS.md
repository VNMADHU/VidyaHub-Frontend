# Vidya Hub Coding Standards

## General
- Keep every file under 300 lines.
- Use functional React components.
- Prefer composition over inheritance.
- Keep components focused (single responsibility).
- Avoid inline styles unless absolutely necessary.
- Use semantic HTML and accessible labels.

## State Management
- Use Zustand for shared UI/application state.
- Keep store slices small and focused.
- No direct DOM manipulation; rely on React state.

## Styling
- Use CSS variables for theme tokens.
- Keep class names descriptive and consistent.
- Mobile-first responsive layouts using CSS grid/flexbox.

## Structure
- Place shared UI components in src/components.
- Place shared data constants in src/data.
- Place Zustand stores in src/store.

## Naming
- Components: PascalCase (e.g., Header, AuthSection).
- Hooks/Stores: camelCase with use prefix (e.g., useUiStore).
- Data exports: camelCase.

## Quality
- Avoid console logs in production UI.
- Validate inputs in forms.
- Keep props minimal and explicit.

## Accessibility
- Use labels with inputs.
- Provide aria-label for icon-only buttons.
- Maintain sufficient color contrast.
