// ============================================
// RupeeTracker - Smart Spending Pace Module
//
// This is a SIMPLE RULE-BASED HEURISTIC, not real machine learning:
//   safe daily spend = (spendable budget - spent so far this month)
//                       / days remaining in the month
// It's presented to the user honestly as an estimate, not as AI.
// ============================================

function calculateSafeDailySpend() {
    if (!currentBudget) return null;

    const total = Number(currentBudget.total_budget) || 0;
    const savingsGoal = Number(currentBudget.savings_goal) || 0;
    const spendableTotal = Math.max(total - savingsGoal, 0);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysLeft = Math.max(daysInMonth - today + 1, 1);

    const spentThisMonth = (currentExpenses || [])
        .filter(function (expense) {
            const d = new Date(expense.expense_date);
            return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce(function (sum, expense) { return sum + Number(expense.amount); }, 0);

    const remaining = spendableTotal - spentThisMonth;
    const safeDailySpend = Math.max(remaining, 0) / daysLeft;

    const daysElapsed = Math.max(today - 1, 1);
    const averageDailySoFar = spentThisMonth / daysElapsed;

    let status;
    if (remaining <= 0) {
        status = 'over';
    } else if (averageDailySoFar > safeDailySpend * 1.15) {
        status = 'fast';
    } else {
        status = 'on-track';
    }

    return {
        spendableTotal: spendableTotal,
        spentThisMonth: spentThisMonth,
        remaining: remaining,
        daysLeft: daysLeft,
        safeDailySpend: safeDailySpend,
        status: status
    };
}

function renderSmartPace() {
    const card = document.getElementById('smart-pace-card');
    const amountEl = document.getElementById('safe-daily-amount');
    const detailEl = document.getElementById('smart-pace-detail');
    const messageEl = document.getElementById('smart-pace-message');
    if (!card || !amountEl || !detailEl || !messageEl) return;

    if (!currentBudget) {
        card.classList.add('hidden');
        return;
    }

    const result = calculateSafeDailySpend();
    if (!result) return;

    card.classList.remove('hidden');

    amountEl.textContent = '₹' + result.safeDailySpend.toFixed(2);
    detailEl.textContent = 'You have ₹' + Math.max(result.remaining, 0).toFixed(2) + ' left to spend over the next ' +
        result.daysLeft + ' day' + (result.daysLeft === 1 ? '' : 's') + ' of this month.';

    const messages = {
        'over': { text: '⚠️ You\'ve already spent more than your budget for this month.', cls: 'text-red-600' },
        'fast': { text: '🐇 You\'re spending a bit faster than planned — try to ease up a little to stay on budget.', cls: 'text-amber-600' },
        'on-track': { text: '✅ Nice — you\'re on track to stay within budget this month.', cls: 'text-emerald-600' }
    };

    const m = messages[result.status] || messages['on-track'];
    messageEl.textContent = m.text;
    messageEl.className = 'text-sm font-medium mt-1 ' + m.cls;
}

console.log("✅ ml-predictions.js loaded successfully");
