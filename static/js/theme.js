class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('themeToggle');
        this.themeIcon = document.getElementById('themeIcon');
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.editors = [];
        
        this.initialize();
    }

    initialize() {
        this.applyTheme();
        this.setupEventListeners();
        this.setupEditors();
    }

    setupEditors() {
        // Store references to CodeMirror editors if they exist
        const headersEditor = document.querySelector('#headers-editor .CodeMirror');
        const bodyEditor = document.querySelector('#body-editor .CodeMirror');
        
        if (headersEditor) this.editors.push(headersEditor.CodeMirror);
        if (bodyEditor) this.editors.push(bodyEditor.CodeMirror);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateIcon();
        this.updateEditorThemes();
    }

    updateEditorThemes() {
        this.editors.forEach(editor => {
            if (editor) {
                if (this.currentTheme === 'dark') {
                    editor.setOption('theme', 'ayu-dark');
                } else {
                    editor.setOption('theme', 'default');
                }
            }
        });
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
    }

    updateIcon() {
        if (this.themeIcon) {
            this.themeIcon.innerHTML = this.currentTheme === 'light' 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
        }
    }

    setupEventListeners() {
        this.themeToggle?.addEventListener('click', () => this.toggleTheme());
    }
}

// Initialize theme manager after editors are created
document.addEventListener('DOMContentLoaded', () => {
    // Wait for CodeMirror editors to be initialized
    setTimeout(() => {
        window.themeManager = new ThemeManager();
    }, 100);
});
