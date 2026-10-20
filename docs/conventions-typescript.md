# Fabricio's TypeScript conventions (applyTo: **/*.ts)

Spirit: static over dynamic types; explicit data flow; grep-friendly patterns; immutable; pure; composition over inheritance; exhaustive matching; Result/Maybe over exceptions; strict generics; typed values over primitives; parser combinators over ad-hoc string manipulation.

## Modules
- No relative imports: `import { myFun } from "@/a/b/c/d"`.
- List exports at the top: `export { myFun, myConst, MyClass }`.

## Types
- Branded types as classes:
  class MyId {
    // @ts-expect-error _tag's existence prevents structural comparison
    private readonly _tag: null = null;
    constructor(public value: string) {}
  }
- Discriminated unions instead of multiple optionals that allow invalid combos.
- Exhaustive switch: default { const _exhaustiveCheck: never = x; throw new Error(`Unknown: ${JSON.stringify(_exhaustiveCheck)}`); }
- No empty sentinel objects (e.g. Id.empty()); use Maybe / Nothing().
- Reduce type inhabitants: no Maybe<Array> when [] works.
- `as const` objects + `type X = (typeof X)[keyof typeof X]` instead of enums; refactor legacy enums when localized.

## Functions
- Explicit return types on top-level functions (JSX components exempt).
- No `any`; generics preserve type info.
- Immutable updates (spread); local short-lived mutation OK if it doesn't escape.
- Pure functions; no hidden side effects.

## Schemas (Zod is the base; do NOT use a custom @/lib/schema module)
- Explicit Zod schemas for everything encoded/decoded; no superjson; no ad-hoc string parsing (split etc.).
- Derive types with `type X = z.infer<typeof schema>`; schema first, never duplicate type definitions.
- Discriminated unions: `z.discriminatedUnion("type", [z.object({ type: z.literal("conversation") }), ...])`.
- String enums: `z.enum(["Pending", "Completed", "Failed"])`.
- Combinators instead of string hacks, e.g. dates: `z.string().date().transform((s) => DateOnly.parse(s))` or `z.iso.date()` depending on Zod version.
- Schemas as static members of their class:
  class MessageId {
    // @ts-expect-error _tag's existence prevents structural comparison
    private readonly _tag: null = null;
    constructor(public value: string) {}
    static schema = z.string().transform((v): MessageId => new MessageId(v));
  }
  Encoding back is explicit: `id.value` (or a `toJSON(): string` method) — no magic serializer.
- Prefer `safeParse` and convert to Result (neverthrow) instead of `parse` throwing.

## Errors
- Don't double-wrap promises/async Result functions.
- Result<T, E> (neverthrow) for expected failures (validation, not found, API errors); throw only for unrecoverable programmer errors. Chain with map/andThen/mapErr; consume with match.
