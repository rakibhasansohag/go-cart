
## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- ALWAYS consult graphify FIRST before starting work on any task, feature, refactoring, or architectural change.
- Read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure to understand affected dependencies.
- If `graphify-out/wiki/index.md` exists, navigate it to trace relationships instead of reading raw files directly.
- For cross-module "how does X relate to Y" questions or dependency tracing, use `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"`.
- After modifying code files in any session, run `graphify update .` to keep the graph current (AST-only, no API cost).

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
18. In `coupon-details.tsx`, `product-details.tsx`, & `globals.css`:
    - **Responsive Date Grid**: Wrapped `Start date` and `End date` fields in a responsive grid container (`grid grid-cols-1 md:grid-cols-2 gap-4`), rendering side-by-side on desktop/modals and stacked on mobile.
    - **Past Date Prevention**: Added `minDate={new Date(new Date().setHours(0, 0, 0, 0))}` to `startDate` and `saleEndDate`, and set `endDate`'s `minDate` dynamically to the selected `startDate` or today. This prevents selecting past dates before today or end dates before start dates.
    - **Hidden Input Steppers**: Enforced `display: none !important; opacity: 0 !important; -webkit-appearance: none !important; -moz-appearance: textfield !important;` on `::-webkit-inner-spin-button` and `::-webkit-outer-spin-button` for all `input[type="number"]` and `.react-datetime-picker__inputGroup__input`. This completely hides the browser's native up/down stepper arrows across both standalone pages and modal dialogs.
19. In `src/app/dashboard/seller/stores/[storeUrl]/shipping/page.tsx` & `shipping-view.tsx`:
    - **Server Data Prefetching**: Updated `page.tsx` (Server Component) to fetch `getStoreDefaultShippingDetails` and `getStoreShippingRates` on the server and pass them as `initialDetails` & `initialRates` to `ShippingView`.
    - **Eliminated setState-during-render warning**: Replaced `useSuspenseQuery` with `useQuery` seeded with `initialData`. This resolved the React warning (`Cannot update a component ('Router') while rendering a different component ('ShippingView')`), while retaining client-side pagination speed in `@/components/ui/data-table`.
20. In `src/queries/store.ts` & `store-details.tsx`:
    - **Server-Side Immutable Guard**: In `upsertStore`, added a server guard that strips `email` and `url` from the `update` object when editing an existing store. This guarantees that API payloads cannot alter a store's email or URL.
    - **UI Form Lockdown**: Set `disabled={isLoading || Boolean(data?.id)}` on Store Email and Store URL input fields when editing an existing store, preventing modification in the client UI.
21. In `src/app/dashboard/seller/stores/[storeUrl]/settings/page.tsx` & `store-settings-view.tsx`:
    - **Server-Side Prefetching for Store Settings**: Updated `page.tsx` (Server Component) to fetch `getStoreByUrl(storeUrl)` on the server and pass it as `initialStore` to `StoreSettingsView`. Replaced `useSuspenseQuery` with `useQuery` seeded with `initialData: initialStore`, resolving the React console warning (`Cannot update a component ('Router') while rendering a different component ('StoreSettingsView')`).
22. In `store-details.tsx` & `image-upload.tsx`:
    - **Store Information Responsive UI**: Fixed non-responsive hardcoded `-left-48 inset-x-96` and static `348px` height classes. Changed logo avatar container positioning to `absolute -bottom-14 sm:-bottom-20 left-4 sm:left-8 z-10` and scaled avatar dimensions to `w-36 h-36 sm:w-48 sm:h-48 md:w-52 md:h-52`. Made cover photo height responsive (`h-[200px] sm:h-[280px] md:h-[348px]`), ensuring the store header fits cleanly across mobile, tablet, and desktop screens without horizontal overflow.
23. In `src/hooks/use-form-dirty-guard.ts` & Dashboard Forms (`store-details.tsx`, `product-details.tsx`, `coupon-details.tsx`, `category-details.tsx`, `subCategory-details.tsx`, `offer-tag-details.tsx`, `shippingRate-details.tsx`, `store-default-shipping-details.tsx`):
    - **Reusable Dirty State Guard**: Created `useFormDirtyGuard` custom hook that tracks form dirty state (`isDirty`) and computes `isSaveDisabled = isLoading || (isEditing && !isDirty)`. Connected `isSaveDisabled` to the submit button disabled prop across all dashboard edit forms and modals, preventing unnecessary repeat saves when no fields have been modified. Provided `resetDirtyState()` to automatically reset the baseline after successful save.

---

## Feature Development & Integration Wiring Rule

**CRITICAL MANDATE**:
Before implementing any new feature, bug fix, or schema change:
1. **End-to-End Dependency & Wiring Inspection**: Trace the entire data pipeline across all connected layers before modifying code:
   - **Database Schema**: Prisma models, relations, default values, and migration constraints.
   - **Backend / Queries**: Server queries, mutations, filtering parameters, and database calculations (`saveUserCart`, `updateCheckoutProductstWithLatest`, `validateCouponCode`, `createOrderGroup`, `getAllAdminCoupons`, etc.).
   - **State / React Query**: Query keys, prefix invalidations (`queryClient.invalidateQueries({ queryKey: [...] })`), and cache refresh handlers (`router.refresh()`).
   - **Forms / Inputs**: React Hook Form schemas, `z.preprocess` type coercions, number input empty state handling, and modal triggers.
   - **UI Views / Display Components**: Customer cart summary, checkout totals, order details modal, admin tables, seller dashboard analytics.
2. **Atomic Simultaneous Updates**: When creating or modifying a feature, ALWAYS update all connected components, queries, models, and calculation handlers in the same step. Never leave disconnected wiring, missing properties, or broken calculations across connected modules.
