/**
 * Apple Notes Desktop - App Controller
 * 
 * Uses an embedded webview to display iCloud Notes directly from icloud.com
 */

class AppleNotesApp {
    constructor() {
        // DOM Elements
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.webviewContainer = document.getElementById('webview-container');
        this.webview = document.getElementById('notes-webview');
        this.webviewLoading = document.getElementById('webview-loading');

        // Title bar controls
        this.backBtn = document.getElementById('back-btn');
        this.forwardBtn = document.getElementById('forward-btn');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.homeBtn = document.getElementById('home-btn');
        this.statusDot = document.querySelector('.status-dot');

        // Buttons
        this.startBtn = document.getElementById('start-btn');

        // iCloud Notes URL
        this.notesUrl = 'https://www.icloud.com/notes';

        // State
        this.hasStarted = false;
        this.isLoggedIn = false;

        // Initialize
        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupWebview();

        // Check if user has logged in before - if so, auto-start
        await this.checkPreviousLogin();
    }

    async checkPreviousLogin() {
        try {
            const state = await window.api.getLoginState();
            if (state && state.hasLoggedInBefore) {
                // User has logged in before, auto-start to use saved session
                console.log('Previous login found, auto-starting...');
                this.start();
            }
        } catch (error) {
            console.log('No previous login state found');
        }
    }

    bindEvents() {
        // Start button
        this.startBtn.addEventListener('click', () => this.start());

        // Navigation controls
        this.backBtn.addEventListener('click', () => this.goBack());
        this.forwardBtn.addEventListener('click', () => this.goForward());
        this.refreshBtn.addEventListener('click', () => this.refresh());
        this.homeBtn.addEventListener('click', () => this.goHome());

        // Listen for main process events
        window.api.onRefresh(() => this.refresh());
        window.api.onLogout(() => this.logout());
        window.api.onAppState((state) => {
            if (state && state.hasLoggedInBefore && !this.hasStarted) {
                this.start();
            }
        });
    }

    setupWebview() {
        // Webview event handlers
        this.webview.addEventListener('did-start-loading', () => {
            this.setLoading(true);
        });

        this.webview.addEventListener('did-stop-loading', () => {
            this.setLoading(false);
            this.updateNavButtons();
        });

        this.webview.addEventListener('did-fail-load', (event) => {
            console.error('Webview failed to load:', event.errorDescription);
            this.setStatus('error');
        });

        this.webview.addEventListener('did-finish-load', () => {
            this.setStatus('connected');
            this.injectCustomStyles();

            // Check if we're on the notes page (logged in)
            const currentUrl = this.webview.getURL();
            if (currentUrl.includes('icloud.com/notes') && !currentUrl.includes('authenticate')) {
                // User appears to be logged in, save this state
                this.markAsLoggedIn();
            }
        });

        this.webview.addEventListener('dom-ready', () => {
            // Inject custom CSS for better dark mode support
            this.injectCustomStyles();

            // Set user agent for this webview
            this.webview.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');
        });

        // Handle new windows (e.g., links that want to open in new tab)
        this.webview.addEventListener('new-window', (event) => {
            event.preventDefault();
            window.api.openExternal(event.url);
        });

        // Update navigation button states
        this.webview.addEventListener('did-navigate', () => {
            this.updateNavButtons();
            this.checkLoginStatus();
        });

        this.webview.addEventListener('did-navigate-in-page', () => {
            this.updateNavButtons();
        });
    }

    async markAsLoggedIn() {
        if (!this.isLoggedIn) {
            this.isLoggedIn = true;
            try {
                await window.api.markLoggedIn();
                console.log('Login state saved');
            } catch (error) {
                console.error('Failed to save login state:', error);
            }
        }
    }

    checkLoginStatus() {
        const currentUrl = this.webview.getURL();
        // If we're on the notes page (not auth page), user is logged in
        if (currentUrl.includes('icloud.com/notes') && !currentUrl.includes('authenticate') && !currentUrl.includes('signin')) {
            this.markAsLoggedIn();
        }
    }

    start() {
        if (this.hasStarted) return;
        this.hasStarted = true;

        // Switch to webview screen
        this.welcomeScreen.classList.remove('active');
        this.welcomeScreen.classList.add('hidden');
        this.webviewContainer.classList.remove('hidden');
        this.webviewContainer.classList.add('active');

        // Load iCloud Notes
        this.webview.src = this.notesUrl;
        this.setLoading(true);
    }

    goBack() {
        if (this.webview.canGoBack()) {
            this.webview.goBack();
        }
    }

    goForward() {
        if (this.webview.canGoForward()) {
            this.webview.goForward();
        }
    }

    refresh() {
        this.webview.reload();
    }

    goHome() {
        this.webview.src = this.notesUrl;
    }

    logout() {
        // Clear webview and show welcome screen
        this.webview.src = 'about:blank';

        this.webviewContainer.classList.remove('active');
        this.webviewContainer.classList.add('hidden');
        this.welcomeScreen.classList.remove('hidden');
        this.welcomeScreen.classList.add('active');

        this.hasStarted = false;
        this.isLoggedIn = false;
    }

    updateNavButtons() {
        this.backBtn.disabled = !this.webview.canGoBack();
        this.forwardBtn.disabled = !this.webview.canGoForward();
    }

    setLoading(loading) {
        if (loading) {
            this.webviewLoading.classList.remove('hidden');
            this.setStatus('loading');
        } else {
            this.webviewLoading.classList.add('hidden');
        }
    }

    setStatus(status) {
        this.statusDot.classList.remove('loading', 'error');

        switch (status) {
            case 'loading':
                this.statusDot.classList.add('loading');
                break;
            case 'error':
                this.statusDot.classList.add('error');
                break;
            case 'connected':
            default:
                // Default green state
                break;
        }
    }

    injectCustomStyles() {
        // Inject custom CSS to improve appearance and fix cursor
        const customCSS = `
      /* Fix cursor visibility - make it dark/visible */
      * {
        caret-color: #000000 !important;
      }
      
      /* For dark backgrounds, use a visible cursor */
      [contenteditable="true"],
      textarea,
      input[type="text"],
      .note-content,
      .ProseMirror,
      .editor {
        caret-color: #333333 !important;
      }
      
      /* Custom cursor for text areas */
      [contenteditable="true"]::selection,
      textarea::selection,
      input::selection {
        background: rgba(0, 122, 255, 0.3) !important;
      }
      
      /* Hide iCloud header/footer if possible */
      .header-navigation-container {
        display: none !important;
      }
      
      /* Improve scrollbars */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      
      ::-webkit-scrollbar-thumb {
        background: rgba(128, 128, 128, 0.5);
        border-radius: 4px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(128, 128, 128, 0.7);
      }
    `;

        this.webview.insertCSS(customCSS).catch(err => {
            console.log('Could not inject CSS:', err);
        });

        // Inject JavaScript to enable right-click context menu
        const enableContextMenu = `
      // Re-enable context menu (right-click)
      document.addEventListener('contextmenu', function(e) {
        e.stopPropagation();
      }, true);
      
      // Remove any existing context menu blockers
      window.addEventListener('contextmenu', function(e) {
        e.stopPropagation();
      }, true);
      
      // Enable copy/paste keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        // Allow Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
        if (e.ctrlKey && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
          e.stopPropagation();
        }
      }, true);
      
      console.log('Context menu and clipboard enabled');
    `;

        this.webview.executeJavaScript(enableContextMenu).catch(err => {
            console.log('Could not inject context menu script:', err);
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AppleNotesApp();
});
