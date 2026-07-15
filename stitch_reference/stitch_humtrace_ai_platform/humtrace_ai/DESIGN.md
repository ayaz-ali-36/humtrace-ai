---
name: HumTrace AI
colors:
  surface: '#031427'
  surface-dim: '#031427'
  surface-bright: '#2a3a4f'
  surface-container-lowest: '#000f21'
  surface-container-low: '#0b1c30'
  surface-container: '#102034'
  surface-container-high: '#1b2b3f'
  surface-container-highest: '#26364a'
  on-surface: '#d3e4fe'
  on-surface-variant: '#c8c5cd'
  inverse-surface: '#d3e4fe'
  inverse-on-surface: '#213145'
  outline: '#929097'
  outline-variant: '#47464c'
  surface-tint: '#c6c4df'
  primary: '#c6c4df'
  on-primary: '#2f2e43'
  primary-container: '#1a1a2e'
  on-primary-container: '#83829b'
  inverse-primary: '#5d5c74'
  secondary: '#44e2cd'
  on-secondary: '#003731'
  secondary-container: '#03c6b2'
  on-secondary-container: '#004d44'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001c'
  tertiary-container: '#41000e'
  on-tertiary-container: '#eb4762'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e0fc'
  primary-fixed-dim: '#c6c4df'
  on-primary-fixed: '#1a1a2e'
  on-primary-fixed-variant: '#45455b'
  secondary-fixed: '#62fae3'
  secondary-fixed-dim: '#3cddc7'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000e'
  on-tertiary-fixed-variant: '#91002b'
  background: '#031427'
  on-background: '#d3e4fe'
  surface-variant: '#26364a'
typography:
  display-lg:
    fontFamily: Syne
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Syne
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Syne
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-snippet:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

This design system is engineered for high-stakes humanitarian operations and government-grade data monitoring. The brand personality is authoritative, stoic, and mission-critical. It prioritizes clarity and the gravity of the data it hosts over decorative trends.

The design style is a **Minimalist-Editorial Dark Dashboard**. It utilizes a sophisticated dark color palette to reduce eye strain during long-duration monitoring, combined with an editorial layout that treats data with the prestige of a high-end publication. Every element is purposeful, avoiding unnecessary flourishes. The aesthetic relies on precise alignment, thin structural borders, and a strict typographic hierarchy to convey a sense of absolute security and privacy-first engineering.

## Colors

The palette is anchored in deep, "Midnight" tones to establish a serious and secure environment. 

- **Primary Background (#1A1A2E):** Used for the main application shell and standard views.
- **Hero/Dashboard Background (#0D1B2A):** Reserved for high-level analytical overviews and map-heavy interfaces.
- **Privacy/Safety Highlights (#2DD4BF):** Teal is used as the signature "Safe" color, highlighting verified data, encryption status, and privacy-protected elements.
- **Action Accent (#E94560):** A sophisticated red-pink used sparingly for critical calls-to-action that require immediate user intervention. 
- **Secondary Surfaces (#F8F9FA):** Used for exported documents or "light-mode" report modals to ensure high legibility for printed material.
- **Muted Text (#64748B):** Used for secondary metadata and non-critical labels to maintain visual hierarchy.

## Typography

The typography strategy balances the expressive, avant-garde nature of Syne with the utilitarian precision of DM Sans and JetBrains Mono.

- **Syne (Headings):** Used for major page titles and section headers. Its bold, wide proportions give the system a modern, "Global Intelligence" feel.
- **DM Sans (Body):** Used for all primary reading experiences. Its low-contrast, geometric shapes ensure maximum readability across varying data densities.
- **JetBrains Mono (Data/Labels):** Used for technical metadata, unique identifiers (UIDs), timestamps, and status labels. The monospaced nature emphasizes the "processed" and technical accuracy of the AI-driven data.

## Layout & Spacing

This design system utilizes a **Fixed-Fluid Hybrid Grid**. Content is housed within a maximum container width of 1440px to ensure line lengths for reports remain readable. 

- **Grid Model:** A 12-column grid on desktop with 24px gutters. On tablet (768px+), it shifts to an 8-column grid. On mobile, a 4-column grid with 16px margins.
- **Spacing Rhythm:** Based on an 8px baseline. Use `stack-lg` for separating major sections and `stack-sm` for internal component elements.
- **Alignment:** Editorial-style alignment. Text-heavy columns should follow a strict vertical rhythm to mimic high-end technical journals.

## Elevation & Depth

Elevation is achieved through **Tonal Layering** and **Thin Outlines** rather than traditional shadows. This maintains the "Government-Grade" professional look and avoids the "bubbly" feel of consumer apps.

- **Surface Levels:** 
  - Level 0 (Background): #1A1A2E
  - Level 1 (Cards/Panels): #24243E (A slight lighten of the background)
  - Level 2 (Modals/Popovers): #2D2D4D
- **Borders:** All interactive surfaces and cards use a 1px solid border. Use `rgba(255, 255, 255, 0.1)` for standard borders and the Teal (#2DD4BF) for active/focused states.
- **Shadows:** Avoid drop shadows for cards. Use a subtle, 40% opacity black shadow only for floating elements like dropdown menus or tooltips to provide minimal separation.

## Shapes

The shape language is "Soft-Square." This provides a contemporary feel while maintaining the structural rigidity required for a serious intelligence platform. 

- **Base Radius:** 4px (0.25rem) for inputs, buttons, and small components.
- **Container Radius:** 8px (0.5rem) for primary cards and dashboard widgets.
- **Pill Shapes:** Strictly reserved for status tags (e.g., "Active", "Verified") to distinguish them from interactive buttons.

## Components

- **Buttons:** Primary buttons use the Teal (#2DD4BF) with black text for maximum contrast. Critical "Emergency" actions use the Red Accent (#E94560). All buttons use a 4px corner radius and "JetBrains Mono" in All-Caps for the label.
- **Input Fields:** Dark background (#0D1B2A) with a 1px border. The label sits above the field in "JetBrains Mono" at 12px. Focus states transition the border color to Teal.
- **Cards:** Cards should have no background fill on Level 1 surfaces; instead, use the 1px white-alpha border. This creates a "wireframe" editorial look.
- **Data Tables:** High-density. Rows use a subtle hover state change (lighten background by 2%). Use thin 1px horizontal dividers only; no vertical dividers.
- **Chips/Status:** Use the Status colors (Green, Amber, Red) for text and border only, with a 10% opacity background fill of the same color. 
- **Privacy Indicators:** A dedicated "Secure" badge component featuring a lock icon and Teal (#2DD4BF) glow (2px blur) to signify privacy-first zones.