// ============================================
// RupeeTracker - Expenses Module
// Handles: adding, listing, and deleting expenses
// (Supabase `expenses` table).
// ============================================

// Populate the category <select> in the Add Expense modal.
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

// Wire up the Add Expense form submission
const expenseForm = document.getElementById('expense-form');
if (expenseForm) {
    expenseForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!currentUserId) {
            alert("You must be logged in to add an expense");
            return;
        }

        const name = document.getElementById('expense-name').value.trim();
        const category = document.getElementById('expense-category').value;
        const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
        const date = document.getElementById('expense-date').value;
        const description = document.getElementById('expense-desc').value.trim();

        if (!name || !category || amount <= 0 || !date) {
            alert("Please fill in all required fields");
            return;
        }

        const submitBtn = expenseForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding...';
        }

        try {
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

            populateExpenseTable();
            if (typeof renderCharts === 'function') renderCharts();
            if (typeof renderSmartPace === 'function') renderSmartPace();

            expenseForm.reset();
            closeExpenseModal();

        } catch (error) {
            console.error("❌ Error adding expense:", error);
            alert("Error adding expense: " + (error.message || "Please try again"));
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
}

// Render all expenses into the table on the Expenses page
function populateExpenseTable() {
    const tbody = document.getElementById('expense-table-body');
    if (!tbody) return;

    if (!currentExpenses || currentExpenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-500">No expenses yet</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    currentExpenses.forEach(function (expense) {
        const row = document.createElement('tr');
        row.innerHTML =
            '<td class="p-3">' + formatDate(expense.expense_date) + '</td>' +
            '<td class="p-3">' + escapeHtml(expense.name) + '</td>' +
            '<td class="p-3">' + escapeHtml(expense.category) + '</td>' +
            '<td class="p-3">₹' + Number(expense.amount).toFixed(2) + '</td>' +
            '<td class="p-3 text-right">' +
            '<button data-id="' + expense.id + '" class="delete-expense-btn text-red-600 hover:text-red-800 font-medium text-xs">Delete</button>' +
            '</td>';
        tbody.appendChild(row);
    });

    tbody.querySelectorAll('.delete-expense-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            deleteExpense(btn.dataset.id);
        });
    });
}

// Delete an expense by id
async function deleteExpense(expenseId) {
    if (!confirm("Delete this expense?")) return;

    try {
        const { error } = await sb
            .from('expenses')
            .delete()
            .eq('id', expenseId);

        if (error) throw error;

        currentExpenses = currentExpenses.filter(function (e) { return e.id !== expenseId; });
        console.log("✅ Expense deleted");

        populateExpenseTable();
        if (typeof renderCharts === 'function') renderCharts();
        if (typeof renderSmartPace === 'function') renderSmartPace();

    } catch (error) {
        console.error("❌ Error deleting expense:", error);
        alert("Error deleting expense: " + (error.message || "Please try again"));
    }
}

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
