# Mobile Assets

This folder mirrors `assets/` with Android/WebView-optimized media.

Run:

```bash
npm run optimize-assets
```

The web version keeps using `assets/`. `prepare-mobile` overlays this folder onto
`dist-mobile/assets` when optimized files exist.
