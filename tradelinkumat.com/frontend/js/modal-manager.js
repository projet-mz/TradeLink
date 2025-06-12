class ModalManager {
    constructor() {
        this.activeModal = null;
        this.init();
    }

    init() {
        this.bindEventListeners();
        this.createModalStyles();
    }

    bindEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && e.target.classList.contains('show')) {
                this.hideModal(e.target.id);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.hideModal(this.activeModal.id);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || e.target.classList.contains('btn-close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            }
        });
    }

    createModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .modal {
                display: none;
                position: fixed;
                z-index: 1050;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .modal.show {
                display: flex !important;
                align-items: center;
                justify-content: center;
                opacity: 1;
            }

            .modal-dialog {
                position: relative;
                width: auto;
                max-width: 500px;
                margin: 1rem;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .modal.show .modal-dialog {
                transform: scale(1);
            }

            .modal-dialog.modal-lg {
                max-width: 800px;
            }

            .modal-dialog.modal-xl {
                max-width: 1140px;
            }

            .modal-content {
                position: relative;
                background-color: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
            }

            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1.5rem;
                border-bottom: 1px solid #dee2e6;
                background: var(--gradient-primary);
                color: white;
            }

            .modal-title {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 600;
            }

            .modal-body {
                padding: 1.5rem;
                overflow-y: auto;
                flex: 1;
            }

            .modal-footer {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 0.5rem;
                padding: 1rem 1.5rem;
                border-top: 1px solid #dee2e6;
                background-color: #f8f9fa;
            }

            .btn-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: white;
                cursor: pointer;
                opacity: 0.8;
                transition: opacity 0.2s ease;
            }

            .btn-close:hover {
                opacity: 1;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }

            .modal-close:hover {
                opacity: 1;
            }

            @media (max-width: 768px) {
                .modal-dialog {
                    margin: 0.5rem;
                    max-width: calc(100% - 1rem);
                }

                .modal-content {
                    max-height: 95vh;
                }

                .modal-header,
                .modal-body,
                .modal-footer {
                    padding: 1rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        if (this.activeModal) {
            this.hideModal(this.activeModal.id);
        }

        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        
        modal.offsetHeight;
        
        modal.classList.add('show');
        this.activeModal = modal;

        const firstFocusable = modal.querySelector('input, textarea, select, button');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('show');
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 300);

        if (this.activeModal === modal) {
            this.activeModal = null;
        }
    }

    createModal(config) {
        const {
            id,
            title,
            body,
            footer,
            size = '',
            closable = true
        } = config;

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = id;
        modal.setAttribute('tabindex', '-1');

        const sizeClass = size ? `modal-${size}` : '';
        
        modal.innerHTML = `
            <div class="modal-dialog ${sizeClass}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        ${closable ? '<button type="button" class="btn-close" aria-label="Close">×</button>' : ''}
                    </div>
                    <div class="modal-body">
                        ${body}
                    </div>
                    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        return modal;
    }

    confirmDialog(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const modalId = 'confirm-modal-' + Date.now();
            
            const modal = this.createModal({
                id: modalId,
                title: title,
                body: `<p>${message}</p>`,
                footer: `
                    <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
                    <button type="button" class="btn btn-danger" data-action="confirm">Confirm</button>
                `,
                size: 'sm'
            });

            modal.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'confirm') {
                    resolve(true);
                    this.hideModal(modalId);
                    setTimeout(() => modal.remove(), 300);
                } else if (action === 'cancel') {
                    resolve(false);
                    this.hideModal(modalId);
                    setTimeout(() => modal.remove(), 300);
                }
            });

            this.showModal(modalId);
        });
    }

    alertDialog(message, title = 'Alert') {
        return new Promise((resolve) => {
            const modalId = 'alert-modal-' + Date.now();
            
            const modal = this.createModal({
                id: modalId,
                title: title,
                body: `<p>${message}</p>`,
                footer: `<button type="button" class="btn btn-primary" data-action="ok">OK</button>`
            });

            modal.addEventListener('click', (e) => {
                if (e.target.dataset.action === 'ok') {
                    resolve();
                    this.hideModal(modalId);
                    setTimeout(() => modal.remove(), 300);
                }
            });

            this.showModal(modalId);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.modalManager = new ModalManager();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}
