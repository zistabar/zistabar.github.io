# zistabar.github.io

Personal landing page, served at <https://zieta.me>. Plain HTML, CSS and
JavaScript — no build step, no dependencies.

Pushing to `main` deploys it: GitHub Pages builds from the branch root, and
`CNAME` points the custom domain at it.

## Layout

    index.html        landing page
    css/styles.css    theme tokens (light/dark) and layout
    js/boids.js       flocking simulation drawn on the background canvas
    js/main.js        theme toggle + idle "footnote" easter egg
    CNAME             custom domain for GitHub Pages

## Running it locally

    python3 -m http.server 8000   # http://localhost:8000

## Notes

- The theme follows the OS by default. Clicking the sun/moon stores an explicit
  choice under the `color-theme` key in `localStorage`.
- The easter-egg footnote appears after 30 seconds without cursor movement and
  stays until it is closed. Change `IDLE_SECONDS` in `js/main.js`.
- Flock size, speed and triangle size are the options passed to
  `startBoids()` in `js/main.js`.
