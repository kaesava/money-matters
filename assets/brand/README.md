# Kaesava Brand Icon System

Shared brand assets for the Kaesava product suite. Each app under the Kaesava umbrella uses this common visual language.

## Brand Language

| Token | Value | Usage |
|---|---|---|
| Background | `#F7F8FA` (off-white) | Icon canvas, light surfaces |
| K mark | `#1B2B4B` (navy) | Kaesava K watermark (bold, ~18% opacity as backdrop) |
| Primary | `#2563eb` (Serene Blue) | Dominant arc/symbol colour across all apps |
| Secondary | `#93c5fd` (sky blue) | Mid-tier segment |
| Accent | `#22c55e` (green) | Healthy outcome / surplus / goal indicator |

## Icon Anatomy

Every Kaesava product icon follows this 3-layer structure:

```
┌─────────────────────────────────┐
│  Layer 1 (background):          │
│  Off-white rounded square       │
│                                 │
│  Layer 2 (brand watermark):     │
│  Large bold "K" @ 18% opacity   │
│  (identifies the Kaesava suite) │
│                                 │
│  Layer 3 (product symbol):      │
│  App-specific foreground mark   │
│  (budget arc, tools icon, etc.) │
└─────────────────────────────────┘
```

## Master Files

| File | Size | Purpose |
|---|---|---|
| `money-matters-icon-1024.png` | 1024×1024 | Money Matters master |
| `money-matters-icon-512.png` | 512×512 | Money Matters medium |
| `kaesava-mark-1024.png` | 1024×1024 | Kaesava standalone brand mark |
| `kaesava-mark-512.png` | 512×512 | Kaesava standalone brand mark (medium) |

## Adding a New App

1. Design a foreground product symbol using the same off-white background + K watermark structure
2. Use Serene Blue (`#2563eb`) as the primary symbol colour
3. Add a green (`#22c55e`) accent where appropriate (outcome/health indicator)
4. Generate sizes following the table below and place in `apps/<appname>/assets/` (mobile) and `apps/<appname>/public/` (web)

## Required Sizes per App

### Mobile (Expo/Android — `apps/<appname>/assets/`)

| File | Size | Notes |
|---|---|---|
| `icon.png` | 1024×1024 | Launcher icon; Expo applies the shape mask |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground; content padded to 75% of canvas for safe zone |
| `splash.png` | 1284×2778 | App splash screen; use `#1B2B4B` background |

### Web (Next.js — `apps/<appname>/public/`)

| File | Size | Notes |
|---|---|---|
| `favicon.ico` | 16+32+48 multi | Browser tab icon (multi-resolution) |
| `favicon-16x16.png` | 16×16 | Small favicon |
| `favicon-32x32.png` | 32×32 | Standard favicon |
| `apple-touch-icon.png` | 180×180 | iOS home screen |
| `icon-192x192.png` | 192×192 | PWA / Android |
| `icon-512x512.png` | 512×512 | PWA splash / large display |
| `site.webmanifest` | — | PWA manifest |

> Also copy `favicon.ico` to `apps/<appname>/src/app/favicon.ico` so Next.js App Router auto-detects it.

### Quick Resize Command

```bash
SRC="path/to/master-icon.jpg"
APP="apps/<appname>"

# Mobile
convert "$SRC" -resize 1024x1024 "$APP/assets/icon.png"
convert "$SRC" -resize 768x768 -gravity center -background "#F7F8FA" -extent 1024x1024 "$APP/assets/adaptive-icon.png"

# Web
convert "$SRC" -resize 16x16   "$APP/public/favicon-16x16.png"
convert "$SRC" -resize 32x32   "$APP/public/favicon-32x32.png"
convert "$SRC" -resize 180x180 "$APP/public/apple-touch-icon.png"
convert "$SRC" -resize 192x192 "$APP/public/icon-192x192.png"
convert "$SRC" -resize 512x512 "$APP/public/icon-512x512.png"
convert "$APP/public/favicon-16x16.png" "$APP/public/favicon-32x32.png" "$APP/public/favicon.ico"
cp "$APP/public/favicon.ico" "$APP/src/app/favicon.ico"
```
