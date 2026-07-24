## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

---

## Known Issues & Fixes

Track recurring bugs and their resolutions here so they can be applied quickly in the future.

---

### [TS] JoditEditor `popupRoot` — TypeScript DOM structural incompatibility

**File**: `src/components/dashboard/forms/product-details.tsx`

**Symptom**: Massive TypeScript error chain on the `config` prop of `<JoditEditor>`:

    Type 'HTMLElement | null' is not assignable to type '...'
      Types of property 'offsetParent' are incompatible
        (cascades: Element -> NamedNodeMap -> Attr -> ownerDocument -> HTMLCollectionOf -> ShadowRoot -> CSSStyleSheet -> ...)

**Root cause**: Jodit's bundled type declarations were compiled against a different snapshot of `lib.dom.d.ts` than the project's TypeScript uses. TypeScript does structural (not nominal) type checking, so it walks every field recursively and finds mismatches deep in DOM types.

**Fix**: Type the `config` variable as `any` to bypass the structural walk:

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = useMemo(() => ({
      theme: currentTheme === 'dark' ? 'dark' : 'default',
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      defaultActionOnPaste: 'insert_clear_html' as const,
      showPlaceholder: false,
      height: 300,
      popupRoot: typeof document !== 'undefined' ? document.body : null,
    }), [currentTheme]);

Safe to do — the runtime value is correct; the error is purely a type-declaration version artifact.

---

### [CSS/React] JoditEditor toolbar dropdowns not scrollable inside Radix Dialog

**Files**: `src/components/dashboard/shared/custom-modal.tsx`, `src/app/globals.css`

**Symptom**: Jodit toolbar dropdowns (e.g. font-size picker) open correctly but cannot be scrolled by mouse-wheel or hover — only by clicking the scrollbar track directly.

**Root cause**: Radix Dialog with `modal={true}` (the default) sets `pointer-events: none` on `document.body` while open. Even CSS overrides like `pointer-events: auto !important` on popup child elements don't fully work because Radix applies the lock at the body level, and wheel scroll events dispatched to children are suppressed by the browser before CSS can override them.

**Real fix** — set `modal={false}` on the `<Dialog>` in `custom-modal.tsx`:

    <Dialog open={isOpen || defaultOpen} onOpenChange={setClose} modal={false}>

This completely removes Radix's body `pointer-events: none` locking. The visual overlay (`DialogOverlay`) still renders because it is hardcoded inside `DialogContent`, so there is no visual regression.

**Supporting fix (product-details.tsx)** — mount Jodit popups on body, not the dialog ancestor:

    popupRoot: typeof document !== 'undefined' ? document.body : null,

Without this, Jodit mounts popups inside the dialog's `position:fixed` ancestor, causing position offset miscalculation and misaligned dropdown positions.

**Note**: CSS-only fixes (adding `pointer-events: auto !important` to `.jodit-popup *`) do NOT fully solve this — they restore click events but wheel scroll events are blocked at a lower level by the browser when the nearest scrollable ancestor's pointer-events is none.

