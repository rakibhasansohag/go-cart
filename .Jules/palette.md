## 2024-03-24 - [Store Product Swiper A11y]
**Learning:** Found custom `div` elements used as interactive thumbnails inside a product swiper component without semantic roles or ARIA labels. The component also had several icon-only buttons (zoom controls, navigation) lacking ARIA labels.
**Action:** Always verify custom interactive image galleries for semantic HTML. Convert clickable `div`s to `<button type="button">`, assign appropriate roles (e.g. `role="tab"`), and ensure `aria-label`s are applied to all icon-only controls. Added `focus-visible` styling for keyboard navigation.
