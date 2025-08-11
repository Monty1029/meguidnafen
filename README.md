# Meguidnafen
**_My Emulator GUI Doesn't Need A Frickin' Excellent Name_**

A new GUI for the mednafen emulator. Works on Windows, Linux, and macOS.

## How to Run 🏃‍♂️

* **Install** Node 18+ and npm.
* Run `npm install` to install Electron, then `npm start` to launch the UI.

***

## Mednafen 🕹️

* The app will try to use **Mednafen** from the system PATH.
* To use a specific executable, click **"Set mednafen.exe Path"** and provide the full path to the Mednafen binary.

***

## Importing Games 🎮

* Use **Select Folder -> Scan Selected Folder** to scan for common ROM extensions.
* **Drag-and-drop** or **Import folder** are also supported.
* The UI saves basic info in **userData.json**.

***

## Security 🔒

* The renderer is **sandboxed** (`contextIsolation=true`).
* All filesystem and executable work is performed in the main process through **Inter-Process Communication (IPC)**.
* Works locally without any internet requirements.

Enjoy!

***