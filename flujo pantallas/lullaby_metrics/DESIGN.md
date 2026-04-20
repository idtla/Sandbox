# Design System Strategy: The Ethereal Guardian

## 1. Overview & Creative North Star
This design system is built to transform a utilitarian sleep tracker into a serene, high-end editorial experience. Our Creative North Star is **"The Ethereal Guardian."** In the chaotic, sleep-deprived world of new parenthood, this PWA serves as a calm, authoritative, and frictionless companion.

We move beyond the "standard app" look by rejecting rigid grids and harsh separators. Instead, we embrace **Soft Minimalism**—an approach characterized by intentional asymmetry, breathing room, and a tactile sense of depth. By utilizing the Pixel 9’s high-density display, we leverage subtle tonal shifts and oversized typography to create a layout that feels curated rather than programmed.

## 2. Colors
Our palette is a sophisticated journey through atmospheric blues and clean whites, designed to reduce eye strain during late-night checks.

*   **Primary & Functional:** `primary` (#0053dc) is our "Signal" color—used sparingly for active states and critical data. `tertiary` (#006787) provides a professional, calming contrast for secondary metrics.
*   **The "No-Line" Rule:** To achieve a premium editorial feel, **1px solid borders are strictly prohibited** for sectioning content. Boundaries must be defined solely through background color shifts. For example, a `surface_container_lowest` card should sit atop a `surface_container_low` background.
*   **Surface Hierarchy & Nesting:** Treat the UI as a physical stack of fine paper. 
    *   The base layer is `background` (#f7f9fb).
    *   Primary content containers use `surface_container_lowest` (#ffffff) to provide a "pop" of clean white.
    *   Nested elements (like a sleep session log inside a daily summary) should use `surface_container` or `surface_variant` to define internal hierarchy.
*   **The "Glass & Gradient" Rule:** To inject "soul" into the UI, use a subtle linear gradient for main CTAs, transitioning from `primary` (#0053dc) to `primary_container` (#3e76fe). Use Glassmorphism (semi-transparent `surface_container_lowest` with a 20px backdrop-blur) for floating elements like the bottom navigation bar to allow chart data to bleed through softly.

## 3. Typography
We utilize **Manrope** for its geometric balance and modern legibility. The typography is the primary driver of our brand identity: authoritative yet approachable.

*   **Editorial Contrast:** Use `display-lg` (3.5rem) for active sleep timers or total sleep hours. This creates a bold visual anchor that screams "premium."
*   **Hierarchy of Care:** 
    *   `headline-sm` is reserved for card titles (e.g., "Weekly Cycle").
    *   `body-md` is the workhorse for data labels.
    *   `label-sm` should be used for metadata, set in `on_surface_variant` to recede visually.
*   **Visual Soul:** Lead with generous leading (line-height) in body text to ensure the interface never feels "cramped," maintaining the "Ethereal" quality of the North Star.

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Avoid elevation 1–5 shadows. Instead, create lift by placing a `surface_container_lowest` element on a `surface_dim` background.
*   **Ambient Shadows:** If a floating element (like a FAB) requires a shadow, it must be an "Ambient Glow." Use a blur of 32px or higher with 4% opacity of the `on_surface` color. It should feel like a soft mist, not a hard shadow.
*   **The "Ghost Border" Fallback:** For accessibility in input fields, use a "Ghost Border." This is the `outline_variant` token set to 15% opacity. It provides a hint of structure without breaking the seamless aesthetic.
*   **Glassmorphism:** Navigation bars should use `surface_container_lowest` at 80% opacity with a `backdrop-filter: blur(12px)`. This integrates the UI into the background, making the experience feel like one continuous surface.

## 5. Components

*   **Primary Buttons:** Use the `xl` (3rem) corner radius. The fill should be the signature Primary-to-Primary-Container gradient. Text should be `on_primary`, centered, and set to `title-sm`.
*   **Sleep Charts:** Bar heights should use the `DEFAULT` (1rem) rounding. Use `primary` for the active selection and `secondary_container` for background bars. Forbid the use of axis lines; use `surface_container_high` for very subtle horizontal "guide" washes.
*   **Cards:** Use `lg` (2rem) rounding. Forbid dividers between list items within a card. Use `1.5rem` of vertical whitespace (spacing-xl) to separate items.
*   **Input Fields:** Use a `surface_container_low` fill with `none` for borders. Active state is indicated by a 2px `primary` underline or a subtle `primary` ghost border.
*   **Chips:** Selection chips use `full` (9999px) rounding. Unselected chips should be `surface_container_highest`; selected chips should be `primary` with `on_primary` text.
*   **The "Guardian" Timer:** A bespoke component. A large circular progress indicator using a thick `primary_container` stroke, with the `display-lg` time centered. No harsh edges; all stroke ends must be rounded.

## 6. Do's and Don'ts

### Do:
*   **Do** use white space as a structural element. If a layout feels busy, increase the padding.
*   **Do** use asymmetrical layouts for headers—place the `headline-lg` title on the left and a `surface_tint` icon or avatar on the far right.
*   **Do** ensure all touch targets are at least 48dp, maintaining the "soft" and easy-to-use nature of the PWA.

### Don't:
*   **Don't** use 1px solid black or grey borders. This instantly destroys the high-end editorial feel.
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#2c3437) to maintain tonal softness.
*   **Don't** use "Standard" Material Design shadows. They are too aggressive for this system’s "Ethereal" North Star.
*   **Don't** crowd the edges of the Pixel 9 screen. Use a minimum 24px side margin for all content.