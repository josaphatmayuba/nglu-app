# Marketing Site Agent Notes

## SCRUM-68 - CDN removal

- Runtime CDN dependencies were removed from `index.html`.
- Tailwind now builds locally through `tailwind.config.js`, `postcss.config.js`, and `src/style.css`.
- Lucide icons now come from the npm package `@lucide/vue`; do not reintroduce hosted Lucide scripts or legacy Lucide placeholder attributes.
- Hosted font links were removed. The site uses local/system font stacks, with Georgia/Cambria as the display fallback.
- Before shipping marketing-site changes, run `npm run build` in `marketing-site` and verify the built `dist` has no hosted Tailwind, hosted Lucide, or hosted font references.
