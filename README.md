1) How to run
- Install Node 18+ and npm.
- Run `npm install` (installs electron). Then `npm start` to launch the UI.

2) Mednafen
- The app will try to use `mednafen` from the system PATH. If you want to use a specific executable, click "Set Mednafen Exec" and supply the full path to the mednafen binary.
- On Windows supply `C:\path\to\mednafen.exe`.

3) Importing games
- Use Select Folder -> Scan Selected Folder to scan for common ROM extensions (basic list included). Drag-and-drop or Import folder also supported.
- The UI keeps a simple JSON store in the app data directory for the user.

4) Security
- Renderer is sandboxed (contextIsolation=true) and all filesystem/exec work is done in main process through IPC.

5) Improvements you might want
- Add metadata scraping (images, descriptions) via a local scraper.
- Support compressed archives (zip) by letting mednafen handle them or by unzipping.
- Allow per-system configuration and controller bindings.
- Add thumbnails and cover art caching.

Enjoy! If you want, I can:
- convert the renderer to React + Tailwind with a nicer UI,
- add cover-art scraping and offline storage,
- add a settings page with per-system mednafen args,
- package the app for Windows/macOS/Linux.