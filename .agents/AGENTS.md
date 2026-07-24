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

### [CSS/React] Radix Select Dropdowns & Jodit Editor inside Dialog

**Files**: `src/components/ui/select.tsx`, `src/components/dashboard/shared/custom-modal.tsx`, `src/components/dashboard/forms/product-details.tsx`

**Symptom**:
1. Radix Select dropdown options (Category, Subcategory, Offer) could not be clicked or selected inside `CustomModal` dialog.
2. `getAllCategoriesForCategory(undefined)` triggered unnecessary ~900ms server queries on mount when no category was selected.

**Root cause**:
1. `SelectContent` in `@/components/ui/select.tsx` had `z-50`. When portaled to `document.body`, it rendered **below** `CustomModal`'s `DialogContent` (`z-[999]`).
2. `product-details.tsx` watched `form.watch().categoryId` directly inside `useEffect`, causing `getAllCategoriesForCategory(undefined)` to execute on initial render before a category was selected.

**Fix**:
1. Set `z-[99999]` on `SelectContent` in `select.tsx` so portaled select menus render above the dialog.
2. In `globals.css` & `select.tsx`, added explicit `[data-slot="select-item"]:hover` and `[data-highlighted]` styling with `cursor-pointer` so hovering options shows a high-contrast highlight background effect.
3. In `product-details.tsx`:
   - Watch `selectedCategoryId = form.watch('categoryId')`.
   - Return early `setSubCategories([])` if `!selectedCategoryId`.
   - Populate `subCategories` directly from `categories` prop (`CategoryWithSubs[]`) if available for instant zero-latency subcategory updates.
   - Handle empty subcategory state gracefully when a selected category has no subcategories (`No sub-categories available` placeholder & fallback menu item).
   - Use `ProductDetailsFormSkeleton` when data is loading.
4. In `image-upload.tsx`, added `transition-transform duration-300 ease-bezier-1 ease-in-out will-change-transform` to profile upload container, icon, and button for smooth enter and exit hover scale animations.
5. In `globals.css`, overhauled `.dark .react-calendar` navigation headers, label buttons, active tiles (`#2563eb`), today tile (`#1e293b`), hover states, `.react-datetime-picker__clock-button__clock` outer popup containers (`#111827`), `.react-clock` dial, AM/PM selector (`#1f2937`), input focus segment (`#2563eb`), and red clear button (`#f87171`) for dark theme styling.
6. In `product-details.tsx`, added event listeners (`wheel` and `keydown`) on `react-datetime-picker` inputs so hours (`12 ↔ 1`) and minutes (`59 ↔ 00`) wrap around cyclically when scrolling or pressing ArrowUp/ArrowDown.
7. In `custom-modal.tsx` & `products-table.tsx`, updated modal container `maxWidth` to `w-[95vw] max-w-7xl sm:max-w-5xl lg:max-w-7xl` to provide generous width across viewport sizes. Made `saleEndDate` DateTimePicker and formatted date label wrap cleanly on small screens and narrow modal widths without breaking UI layout.
8. In `ai-product-assistant.tsx`, updated validation, step indicator (`(N/A)`), placeholder (`No sub-categories`), and generate readiness logic so categories with zero subcategories automatically bypass subcategory selection.
9. In `src/app/api/generate-product/route.ts`, implemented a resilient model fallback chain (`gemini-2.5-flash` → `gemini-1.5-flash` → `gemini-2.0-flash-lite` → `gemini-2.0-flash`) so API generation automatically switches models if one encounters HTTP 429 rate limit / quota exhaustion. Made `subCategoryName` optional in API validation.
10. In `src/app/api/generate-image/route.ts` & `src/components/image-prompt-section.tsx`, integrated Pollinations AI (Flux model) and set default `generationSource` to `backend` (AI Pollinations / Gemini). Added auto-fallback from Puter.js to backend AI image generation so image generation resolves reliably with photorealistic images.
11. In `next.config.ts`, added `image.pollinations.ai`, `pollinations.ai`, `images.unsplash.com`, and `source.unsplash.com` to `images.remotePatterns`. Added `unoptimized` prop to `<Image />` tags in `image-prompt-section.tsx` and `images-preview-grid.tsx` for seamless loading.
12. In `ai-product-assistant.tsx`, `image-prompt-section.tsx`, and `product-details.tsx`, added `e.preventDefault()` to form `onSubmit` and explicit `type='button'` to all action buttons. This prevents HTML form submission from sending an unintended HTTP `POST` to the page URL (`POST /dashboard/seller/stores/crafted-compass/products` 404 error).
13. In `src/app/not-found.tsx`, completely redesigned the 404 error page with ambient glowing backdrop effects, animated glowing compass icon card, clear 404 error badge, and crisp high-contrast action buttons (`Go Back`, `Back to Home`, `Browse Products`) matching dark and light mode aesthetics.
14. In `src/lib/schemas.ts`, removed strict regex special character validation errors from `ProductFormSchema` (`name` and `variantName`), allowing product titles with hyphens, quotes, apostrophes, and punctuation.
15. In `product-details.tsx`, `coupon-details.tsx`, & `globals.css`, configured `calendarProps={{ showFixedNumberOfWeeks: true }}` and fixed grid row height (`.react-calendar__month-view__days { min-height: 216px }`). This locks calendar dimensions across all months (28, 30, and 31 days) so navigation buttons (`<` and `>`) stay locked under the cursor.
16. In `product-details.tsx`, `modal-provider.tsx`, and `custom-modal.tsx`:
    - **Post-Creation Redirection**: Automatically calls `setClose(true)` and `router.push('/dashboard/seller/stores/${storeUrl}/products')` to close modal and navigate to products list.
    - **Loading State Lockdown**: Disables all inputs, controls, and applies `pointer-events-none opacity-60` with a blurred saving overlay card during form submission (`isLoading`).
    - **Dirty State Confirmation**: Converted `isDirty` state in `ModalProvider` to a React `useRef` (`isDirtyRef.current`) with `getIsDirty()` and `setIsDirty()`, watching primitive form strings in `product-details.tsx`. Rendered confirmation modal overlay using `createPortal(..., document.body)` with `pointer-events-auto z-[999999]`. Portaling to `document.body` escapes Radix `DialogContent` CSS `transform` containing block constraints so the dark backdrop overlay spans 100% of the browser viewport full-screen, while keeping **Keep Editing** and **Discard & Close** buttons instantly clickable.
17. In `image-upload.tsx`, `image-upload-v1.tsx`, & `upload-images.tsx`, added `onClose` callback to all `<CldUploadWidget>` components. When closing Cloudinary widget without selecting an image, `onClose` automatically resets `isUploading` / `hideModal` state and explicitly restores `document.body.style.pointerEvents = 'auto'` and `document.body.style.overflow = 'auto'`, preventing the standalone `/products/new` page from freezing or becoming unclickable.
18. In `coupon-details.tsx` & `product-details.tsx`:
    - **Responsive Date Grid**: Wrapped `Start date` and `End date` fields in a responsive grid container (`grid grid-cols-1 md:grid-cols-2 gap-4`), rendering side-by-side on desktop/modals and stacked on mobile.
    - **Past Date Prevention**: Added `minDate={new Date(new Date().setHours(0, 0, 0, 0))}` to `startDate` and `saleEndDate`, and set `endDate`'s `minDate` dynamically to the selected `startDate` or today. This prevents selecting past dates before today or end dates before start dates.


