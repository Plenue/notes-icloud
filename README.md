# Apple Notes Desktop

A beautiful, feature-rich Apple Notes client for Windows and Linux, built with Electron.

<img src="https://raw.githubusercontent.com/Plenue/notes-icloud/main/icon.png" width="128" alt="Apple Notes Desktop">

## 🚀 Features

- **Full iCloud Access**: View, edit, and create notes just like on a Mac.
- **Native Experience**:
  - Custom dark mode styling.
  - Native window controls and title bar.
  - Proper context menus (Right-click Copy/Paste).
  - Keyboard shortcuts (Ctrl+C, Ctrl+V, etc.).
- **System Integration**:
  - **System Tray Support**: Close the window to minimize to the tray; keeps your session alive.
  - **Auto-Start**: Option to launch automatically on system boot (minimized).
  - **Single Instance**: Prevents multiple windows; focuses existing app if opened again.
- **Session Persistence**: Stay logged in across restarts (cookies and session state saved securely).

## 📥 Installation

### Windows
You can build the installer yourself:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the installer: `npm run build:win`

This will generate two files in the `dist` folder:
- `Apple Notes Desktop Setup 1.0.0.exe` (Installer with Wizard)
- `Apple Notes Desktop 1.0.0.exe` (Portable)

## 🛠️ Development

### Prerequisites
- Node.js (v16 or higher)
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/Plenue/notes-icloud.git

# Enter directory
cd notes-icloud

# Install dependencies
npm install

# Run in development mode
npm start
# or
npm run dev
```

### Build

```bash
# Build for Windows
npm run build:win

# Build portable only
npm run build:portable
```

## 🔒 Privacy & Security

- This application wraps the official iCloud.com web interface.
- Your credentials are sent directly to Apple; we strictly **do not** store or see your password.
- Session cookies are stored securely in the application's user data folder on your local machine.

## 📝 Disclaimer

This is an unofficial client and is not affiliated with, authorized, maintained, sponsored or endorsed by Apple Inc. "Apple Notes" and "iCloud" are trademarks of Apple Inc.

## 📄 License

MIT
