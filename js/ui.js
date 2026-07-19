// ============================================
// RupeeTracker - Shared UI Helpers
// Toast notifications, a promise-based confirm dialog, and generic
// modal open/close with a real transition (instead of instant hidden
// toggling). Loaded right after app.js so every other file can use it.
// ============================================

// ---- Modal open/close with transition ----
// Modals use two states: the "hidden" class (display:none, for when
// fully closed) and a "modal-open" class (drives the CSS transition to
// visible, defined in css/style.css). We can't transition display:none
// directly, so opening removes "hidden" first, forces a reflow, then
// adds "modal-open" on the next frame; closing removes "modal-open"
// (which starts the fade-out) and only adds "hidden" back after the
// transition finishes.
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    void modal.offsetWidth; // force reflow so the transition actually plays
    modal.classList.add('modal-open');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('modal-open');
    setTimeout(function () {
        modal.classList.add('hidden');
    }, 200);
}

// Click outside the panel (on the dark overlay itself) closes the modal
['budget-modal', 'expense-modal', 'confirm-modal'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', function (e) {
            if (e.target === el) {
                if (id === 'confirm-modal') { closeConfirmModal(); }
                else { closeModal(id); }
            }
        });
    }
});

// Escape key closes whichever modal is open
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('confirm-modal')?.classList.contains('modal-open')) {
        closeConfirmModal();
        return;
    }
    ['budget-modal', 'expense-modal'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el && el.classList.contains('modal-open')) closeModal(id);
    });
});

// ---- Toast notifications (replaces alert()) ----
function showToast(message, type) {
    type = type || 'info'; // 'success' | 'error' | 'info'
    const container = document.getElementById('toast-container');
    if (!container) { console.log('[toast:' + type + ']', message); return; }

    const colors = {
        success: 'bg-emerald-600',
        error: 'bg-red-600',
        info: 'bg-gray-800'
    };

    const toast = document.createElement('div');
    toast.className = 'toast-item ' + (colors[type] || colors.info) +
        ' text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    container.appendChild(toast);

    requestAnimationFrame(function () {
        toast.classList.add('toast-visible');
    });

    setTimeout(function () {
        toast.classList.remove('toast-visible');
        setTimeout(function () { toast.remove(); }, 250);
    }, 3500);
}

// ---- Promise-based confirm dialog (replaces confirm()) ----
// Usage: const ok = await confirmDialog('Delete this expense?');
// Wired to the #confirm-modal markup already in index.html, which uses
// a plain "Cancel" button with onclick="closeConfirmModal()" (a global
// function, defined below) rather than an id-based listener.
let _confirmResolve = null;

function confirmDialog(message, okLabel) {
    return new Promise(function (resolve) {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok-btn');

        if (!modal || !msgEl || !okBtn) {
            resolve(window.confirm(message));
            return;
        }

        msgEl.textContent = message;
        okBtn.textContent = okLabel || 'Confirm';
        _confirmResolve = resolve;

        okBtn.onclick = function () {
            if (_confirmResolve) { _confirmResolve(true); _confirmResolve = null; }
            closeModal('confirm-modal');
        };

        openModal('confirm-modal');
    });
}

// Called by the Cancel button's inline onclick, and by the overlay
// click-outside / Escape handlers above.
function closeConfirmModal() {
    if (_confirmResolve) { _confirmResolve(false); _confirmResolve = null; }
    closeModal('confirm-modal');
}

console.log("✅ ui.js loaded successfully");
