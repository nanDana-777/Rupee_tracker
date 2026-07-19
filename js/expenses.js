// ============================================
// RupeeTracker - Expenses Module
// Handles: adding, editing, listing, deleting, searching/filtering/
// sorting, and CSV-exporting expenses (Supabase `expenses` table).
// ============================================

// Set to an expense id while the modal is in "edit" mode; null means
// the modal is in "add new" mode. Toggled by editExpense() / reset by
// resetExpenseForm() (called from app.js's openExpenseForm/closeExpenseModal).
let editingExpenseId = null;

// Populate the category <select> in the Add/Edit Expense modal.
// Prefers the categories chosen in the user's budget; falls back to the
// full category list if no budget has been set up yet.
function populateCategorySelect() {
    const select = document.getElementById('expense-category');
    if (!select) return;

    const categories = (currentBudget && currentBudget.selected_categories && currentBudget.selected_categories.length > 0)
        ? currentBudget.selected_categories
        : CATEGORIES;

    select.innerHTML = '';
    categories.forEach(function (category) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

// Fill the "Filter by category" dropdown once, from the full master
// list (unlike the add/edit select, this should show every category
// that could possibly appear on a past expense, not just this month's
// budgeted ones).
function populateCategoryFilter() {
    const select = document.getElementById('expense-filter-category');
    if (!select) return;
    const options = ['<option value="">All categories</option>'].concat(
        CATEGORIES.map(function (c) { return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; })
    );
    select.innerHTML = options.join('');
}

// Reset the Add/Edit Expense modal back to a blank "add new" state.
// Called when the modal opens fresh (openExpenseForm in app.js) and
// when it closes (closeExpenseModal in app.js), so edit state never
// leaks into the next time the form is used.
function resetExpenseForm() {
    editingExpenseId = null;
    const form = document.getElementById('expense-form');
    if (form) form.reset();

    const titleEl = document.getElementById('expense-modal-title');
    if (titleEl) titleEl.textContent = 'Add New Expense';

    const submitBtn = document.getElementById('expense-submit-btn');
    if (submitBtn) submitBtn.textContent = 'Add Expense';
}

// Open the modal pre-filled with an existing expense's data, in "edit"
// mode. Wired to the ✏️ button on each table row.
function editExpense(expenseId) {
    const expense = currentExpenses.find(function (e) { return e.id === expenseId; });
    if (!expense) return;

    editingExpenseId = expenseId;
    populateCategorySelect();

    document.getElementById('expense-name').value = expense.name;
    document.getElementById('expense-category').value = expense.category;
    document.getElementById('expense-amount').value = expense.amount;
    document.getElementById('expense-date').value = expense.expense_date;
    document.getElementById('expense-desc').value = expense.description || '';

    const titleEl = document.getElementById('expense-modal-title');
    if (titleEl) titleEl.textContent = 'Edit Expense';

    const submitBtn = document.getElementById('expense-submit-btn');
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    openModal('expense-modal');
}

// Wire up the Add/Edit Expense form submission (handles both modes,
// branching on whether editingExpenseId is set)
const expenseForm = document.getElementById('expense-form');
if (expenseForm) {
    expenseForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!currentUserId) {
            showToast("You must be logged in to save an expense", "error");
            return;
        }

        const name = document.getElementById('expense-name').value.trim();
        const category = document.getElementById('expense-category').value;
        const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
        const date = document.getElementById('expense-date').value;
        const description = document.getElementById('expense-desc').value.trim();

        if (!name || !category || amount <= 0 || !date) {
            showToast("Please fill in all required fields", "error");
            return;
        }

        const submitBtn = document.getElementById('expense-submit-btn');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = editingExpenseId ? 'Saving...' : 'Adding...';
        }

        try {
            if (editingExpenseId) {
                // ---- Update existing expense ----
                const { data, error } = await sb
                    .from('expenses')
                    .update({
                        name: name,
                        category: category,
                        amount: amount,
                        expense_date: date,
                        description: description || null
                    })
                    .eq('id', editingExpenseId)
                    .select()
                    .maybeSingle();

                if (error) throw error;

                const idx = currentExpenses.findIndex(function (ex) { return ex.id === editingExpenseId; });
                if (idx !== -1) currentExpenses[idx] = data;

                console.log("✅ Expense updated");
                showToast("Expense updated", "success");

            } else {
                // ---- Insert new expense ----
                const { data, error } = await sb
                    .from('expenses')
                    .insert({
                        user_id: currentUserId,
                        name: name,
                        category: category,
                        amount: amount,
                        expense_date: date,
                        description: description || null
                    })
                    .select()
                    .maybeSingle();

                if (error) throw error;

                currentExpenses.unshift(data);
                console.log("✅ Expense added");
                showToast("Expense added", "success");
            }

            populateExpenseTable();
            if (typeof renderCharts === 'function') renderCharts();
            if (typeof renderSmartPace === 'function') renderSmartPace();
            if (typeof renderBudgetProgress === 'function') renderBudgetProgress();

            closeExpenseModal(); // also calls resetExpenseForm()

        } catch (error) {
            console.error("❌ Error saving expense:", error);
            showToast("Error saving expense: " + (error.message || "Please try again"), "error");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
}

// ---- Search / filter / sort ----
// All client-side, over the already-loaded currentExpenses array - no
// extra Supabase queries needed. Reused by both the table render and
// the CSV export, so the two always show/export the same rows.
function getFilteredSortedExpenses() {
    const searchEl = document.getElementById('expense-search');
    const categoryEl = document.getElementById('expense-filter-category');
    const sortEl = document.getElementById('expense-sort');

    const search = (searchEl ? searchEl.value : '').trim().toLowerCase();
    const category = categoryEl ? categoryEl.value : '';
    const sort = sortEl ? sortEl.value : 'date-desc';

    let rows = (currentExpenses || []).slice();

    if (category) {
        rows = rows.filter(function (e) { return e.category === category; });
    }
    if (search) {
        rows = rows.filter(function (e) {
            return (e.name && e.name.toLowerCase().indexOf(search) !== -1) ||
                   (e.description && e.description.toLowerCase().indexOf(search) !== -1);
        });
    }

    rows.sort(function (a, b) {
        switch (sort) {
            case 'date-asc': return a.expense_date.localeCompare(b.expense_date);
            case 'amount-desc': return Number(b.amount) - Number(a.amount);
            case 'amount-asc': return Number(a.amount) - Number(b.amount);
            case 'date-desc':
            default: return b.expense_date.localeCompare(a.expense_date);
        }
    });

    return rows;
}

// Render the (filtered/sorted) expenses into the table
function populateExpenseTable() {
    const tbody = document.getElementById('expense-table-body');
    if (!tbody) return;

    if (!currentExpenses || currentExpenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-500">No expenses yet — add your first one above</td></tr>';
        return;
    }

    const rows = getFilteredSortedExpenses();

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-500">No expenses match your search/filter</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    rows.forEach(function (expense) {
        const row = document.createElement('tr');
        row.innerHTML =
            '<td class="p-3">' + formatDate(expense.expense_date) + '</td>' +
            '<td class="p-3">' + escapeHtml(expense.name) + '</td>' +
            '<td class="p-3">' + escapeHtml(expense.category) + '</td>' +
            '<td class="p-3 tabular-nums">₹' + Number(expense.amount).toFixed(2) + '</td>' +
            '<td class="p-3 text-right whitespace-nowrap">' +
            '<button data-id="' + expense.id + '" class="edit-expense-btn text-emerald-700 hover:text-emerald-900 font-medium text-xs mr-3">Edit</button>' +
            '<button data-id="' + expense.id + '" class="delete-expense-btn text-red-600 hover:text-red-800 font-medium text-xs">Delete</button>' +
            '</td>';
        tbody.appendChild(row);
    });

    tbody.querySelectorAll('.edit-expense-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            editExpense(btn.dataset.id);
        });
    });
    tbody.querySelectorAll('.delete-expense-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            deleteExpense(btn.dataset.id);
        });
    });
}

// Delete an expense by id (confirmed via the styled confirm dialog,
// not the native browser confirm())
async function deleteExpense(expenseId) {
    const ok = await confirmDialog("Delete this expense? This can't be undone.", "Delete");
    if (!ok) return;

    try {
        const { error } = await sb
            .from('expenses')
            .delete()
            .eq('id', expenseId);

        if (error) throw error;

        currentExpenses = currentExpenses.filter(function (e) { return e.id !== expenseId; });
        console.log("✅ Expense deleted");
        showToast("Expense deleted", "success");

        populateExpenseTable();
        if (typeof renderCharts === 'function') renderCharts();
        if (typeof renderSmartPace === 'function') renderSmartPace();
        if (typeof renderBudgetProgress === 'function') renderBudgetProgress();

    } catch (error) {
        console.error("❌ Error deleting expense:", error);
        showToast("Error deleting expense: " + (error.message || "Please try again"), "error");
    }
}

// ---- CSV export ----
// Exports whatever the search/filter/sort controls currently show -
// "export what I'm looking at" is the more useful default than always
// dumping every expense regardless of the active filter.
function escapeCSV(value) {
    const str = String(value == null ? '' : value);
    if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function exportExpensesCSV() {
    const rows = getFilteredSortedExpenses();
    if (rows.length === 0) {
        showToast("No expenses to export", "info");
        return;
    }

    const header = ['Date', 'Name', 'Category', 'Amount', 'Description'];
    const lines = [header.join(',')];
    rows.forEach(function (expense) {
        lines.push([
            expense.expense_date,
            escapeCSV(expense.name),
            escapeCSV(expense.category),
            expense.amount,
            escapeCSV(expense.description || '')
        ].join(','));
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rupeetracker-expenses-' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Exported ' + rows.length + ' expense' + (rows.length === 1 ? '' : 's') + ' to CSV', 'success');
}

// Wire up search/filter/sort controls + CSV export button once the DOM
// is ready. These elements exist statically in index.html (unlike the
// table rows, which are re-rendered, so their listeners only need to
// be attached once here rather than after every populateExpenseTable()).
document.addEventListener('DOMContentLoaded', function () {
    populateCategoryFilter();

    const searchEl = document.getElementById('expense-search');
    const categoryEl = document.getElementById('expense-filter-category');
    const sortEl = document.getElementById('expense-sort');
    const exportBtn = document.getElementById('export-csv-btn');

    if (searchEl) searchEl.addEventListener('input', populateExpenseTable);
    if (categoryEl) categoryEl.addEventListener('change', populateExpenseTable);
    if (sortEl) sortEl.addEventListener('change', populateExpenseTable);
    if (exportBtn) exportBtn.addEventListener('click', exportExpensesCSV);
});

// Small shared helpers (also used by charts.js for axis labels)
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
}

console.log("✅ expenses.js loaded successfully");
