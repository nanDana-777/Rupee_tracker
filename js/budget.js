// ============================================
// RupeeTracker - Budget Module
// Handles: saving/loading the monthly budget, savings goal, and
// per-category allocations (Supabase `budgets` table).
// ============================================

// Build the checkbox + allocation-amount row for each category inside the
// Budget modal. Called every time the modal opens so it always reflects
// the latest saved budget (if any).
function populateCategoryCheckboxes() {
    const container = document.getElementById('category-checkboxes');
    if (!container) return;

    const savedCategories = (currentBudget && currentBudget.selected_categories) || [];
    const savedAllocations = (currentBudget && currentBudget.category_allocations) || {};

    container.innerHTML = '';

    CATEGORIES.forEach(function (category, index) {
        const isChecked = savedCategories.includes(category);
        const savedAmount = savedAllocations[category] || '';

        const row = document.createElement('div');
        row.className = 'flex items-center gap-2';
        row.innerHTML =
            '<input type="checkbox" id="cat-check-' + index + '" data-category="' + category + '" ' +
            'class="category-checkbox w-4 h-4" ' + (isChecked ? 'checked' : '') + '>' +
            '<label for="cat-check-' + index + '" class="flex-1 text-sm">' + category + '</label>' +
            '<input type="number" id="cat-amount-' + index + '" data-category="' + category + '" ' +
            'min="0" step="0.01" placeholder="₹ amount" ' +
            'class="category-amount w-28 px-2 py-1 border rounded text-sm" ' +
            'value="' + savedAmount + '" ' + (isChecked ? '' : 'disabled') + '>';

        container.appendChild(row);
    });

    // Toggle the amount field alongside its checkbox
    container.querySelectorAll('.category-checkbox').forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
            const index = checkbox.id.split('-').pop();
            const amountInput = document.getElementById('cat-amount-' + index);
            if (amountInput) {
                amountInput.disabled = !checkbox.checked;
                if (!checkbox.checked) amountInput.value = '';
            }
        });
    });
}

// Wire up the Budget form submission
const budgetForm = document.getElementById('budget-form');
if (budgetForm) {
    budgetForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!currentUserId) {
            alert("You must be logged in to save a budget");
            return;
        }

        const totalBudget = parseFloat(document.getElementById('total-budget').value) || 0;
        const savingsGoal = parseFloat(document.getElementById('savings-goal').value) || 0;

        const selectedCategories = [];
        const categoryAllocations = {};

        document.querySelectorAll('.category-checkbox:checked').forEach(function (checkbox) {
            const category = checkbox.dataset.category;
            const index = checkbox.id.split('-').pop();
            const amountInput = document.getElementById('cat-amount-' + index);
            const amount = parseFloat(amountInput.value) || 0;

            selectedCategories.push(category);
            categoryAllocations[category] = amount;
        });

        const submitBtn = budgetForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
        }

        try {
            const payload = {
                user_id: currentUserId,
                total_budget: totalBudget,
                savings_goal: savingsGoal,
                selected_categories: selectedCategories,
                category_allocations: categoryAllocations,
                updated_at: new Date().toISOString()
            };

            let result;
            if (currentBudget && currentBudget.id) {
                // Update the existing budget row
                result = await sb
                    .from('budgets')
                    .update(payload)
                    .eq('id', currentBudget.id)
                    .select()
                    .maybeSingle();
            } else {
                // First-time budget setup for this user
                result = await sb
                    .from('budgets')
                    .insert(payload)
                    .select()
                    .maybeSingle();
            }

            if (result.error) throw result.error;

            currentBudget = result.data;
            console.log("✅ Budget saved");

            updateBudgetDisplay();
            if (typeof populateCategorySelect === 'function') populateCategorySelect();
            if (typeof renderCharts === 'function') renderCharts();
            if (typeof renderSmartPace === 'function') renderSmartPace();

            closeBudgetModal();

        } catch (error) {
            console.error("❌ Error saving budget:", error);
            alert("Error saving budget: " + (error.message || "Please try again"));
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
}

// Update the top summary card (#display-budget / #display-spendable)
function updateBudgetDisplay() {
    const budgetEl = document.getElementById('display-budget');
    const spendableEl = document.getElementById('display-spendable');
    if (!budgetEl || !spendableEl) return;

    if (!currentBudget) {
        budgetEl.textContent = '₹0.00';
        spendableEl.textContent = 'Spendable: ₹0.00 (Savings Goal: ₹0.00) — set up your budget to get started';
        return;
    }

    const total = Number(currentBudget.total_budget) || 0;
    const savingsGoal = Number(currentBudget.savings_goal) || 0;
    const spendable = Math.max(total - savingsGoal, 0);

    budgetEl.textContent = '₹' + total.toFixed(2);
    spendableEl.textContent = 'Spendable: ₹' + spendable.toFixed(2) + ' (Savings Goal: ₹' + savingsGoal.toFixed(2) + ')';
}

console.log("✅ budget.js loaded successfully");
