class SidebarManager {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.mainContent = document.querySelector('.main-content');
        this.toggleBtn = document.getElementById('toggleSidebar');
        this.sidebarState = localStorage.getItem('sidebarState') || 'expanded';
        this.breakpoint = 768;
        
        this.init();
    }

    init() {
        this.applySidebarState();
        this.bindEvents();
        this.handleResize();
    }

    bindEvents() {
        this.toggleBtn.addEventListener('click', () => this.toggleSidebar());
        window.addEventListener('resize', () => this.handleResize());
    }

    toggleSidebar() {
        this.sidebarState = this.sidebarState === 'expanded' ? 'collapsed' : 'expanded';
        this.applySidebarState();
        localStorage.setItem('sidebarState', this.sidebarState);
    }

    applySidebarState() {
        const isCollapsed = this.sidebarState === 'collapsed';
        this.sidebar.classList.toggle('collapsed', isCollapsed);
        this.mainContent.classList.toggle('expanded', isCollapsed);
    }

    handleResize() {
        const isMobile = window.innerWidth <= this.breakpoint;
        this.sidebar.classList.toggle('mobile', isMobile);
        
        if (isMobile) {
            this.sidebarState = 'expanded';
            this.applySidebarState();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.sidebarManager = new SidebarManager();

    // Import API button
    const importApiBtn = document.getElementById('importApiBtn');
    if (importApiBtn) {
        importApiBtn.addEventListener('click', () => {
            const importModal = document.getElementById('importModal');
            if (importModal) {
                importModal.classList.add('active');
            }
        });
    }

    // Export API button
    const exportApiBtn = document.getElementById('exportApiBtn');
    if (exportApiBtn) {
        exportApiBtn.addEventListener('click', () => {
            const exportApiModal = document.getElementById('exportApiModal');
            if (exportApiModal) {
                exportApiModal.classList.add('active');
            }
        });
    }

    // Close modal functionality
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
});
