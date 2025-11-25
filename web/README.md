# Lattice Triangle Web Applet

This is a browser-based version of the triangle visualizer that reuses the Python geometry helpers through Pyodide.

## Run locally

1. From the project root, start a tiny server so the Pyodide runtime can load:
   ```bash
   python3 -m http.server 8000 --directory docs
   ```
   (`web/index.html` is identical; `docs/` is the copy used for publishing.)
2. Visit http://localhost:8000 in a modern browser.
3. Drag the handles on the canvas to move the vertices; metrics update live.

Notes:
- The page pulls the Pyodide runtime from the jsDelivr CDN, so you need a network connection for the first load.
- If you want a different port, change `8000` above to anything open on your machine.
- If you edit `web/index.html`, copy it to `docs/index.html` before publishing.

## Publish on GitHub Pages

1. Push the repo to GitHub.
2. In the repository settings, enable GitHub Pages with source = `main` (or your default branch) and folder = `/docs`.
3. Your site will be available at `https://<username>.github.io/<repo>/` after GitHub finishes the deploy.
