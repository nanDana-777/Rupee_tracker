// ============================================
// RupeeTracker - Charts Module
// Renders the three Chart.js visualizations:
//   - budgetChart:  planned allocation by category (pie)
//   - expenseChart: actual spend by category (pie)
//   - trendChart:   actual spend this month vs. an even budget pace (line)
// ============================================

let budgetChartInstance = null;
let expenseChartInstance = null;
let trendChartInstance = null;

const CHART_COLORS = [
    '#059669', '#0891b2', '#7c3aed', '#db2777', '#d97706',
    '#dc2626', '#4f46e5', '#0d9488', '#65a30d', '#c026d3',
    '#ea580c', '#2563eb', '#71717a'
];

// Fixed category -> color assignment (built once, from the master CATEGORIES
// list in app.js) so "Food & Beverages" is always the same color whether
// it's shown in the Budget Allocations chart or the Actual Spending chart.
// Positional indexing was the old approach, but each chart can have a
// different subset/order of categories present, which made colors
// mismatch between the two charts for the same category.
const CATEGORY_COLORS = {};
(typeof CATEGORIES !== 'undefined' ? CATEGORIES : []).forEach(function (cat, i) {
    CATEGORY_COLORS[cat] = CHART_COLORS[i % CHART_COLORS.length];
});
function colorForCategory(cat) {
    return CATEGORY_COLORS[cat] || '#9ca3af';
}

function renderCharts() {
    renderBudgetChart();
    renderExpenseChart();
    renderTrendChart();
}

function renderBudgetChart() {
    const canvas = document.getElementById('budgetChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const allocations = (currentBudget && currentBudget.category_allocations) || {};
    const labels = Object.keys(allocations).filter(function (cat) { return allocations[cat] > 0; });
    const values = labels.map(function (cat) { return allocations[cat]; });

    if (budgetChartInstance) budgetChartInstance.destroy();
    if (labels.length === 0) return; // no budget set up yet

    budgetChartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map(colorForCategory)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
        }
    });
}

function renderExpenseChart() {
    const canvas = document.getElementById('expenseChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const totals = {};
    (currentExpenses || []).forEach(function (expense) {
        totals[expense.category] = (totals[expense.category] || 0) + Number(expense.amount);
    });

    const labels = Object.keys(totals);
    const values = labels.map(function (cat) { return totals[cat]; });

    if (expenseChartInstance) expenseChartInstance.destroy();
    if (labels.length === 0) return; // no expenses logged yet

    expenseChartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map(colorForCategory)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
        }
    });
}

function renderTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (trendChartInstance) trendChartInstance.destroy();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthExpenses = (currentExpenses || []).filter(function (expense) {
        const d = new Date(expense.expense_date);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    if (monthExpenses.length === 0 && !currentBudget) return; // nothing meaningful to plot yet

    // Total spent on each individual day (day-of-month -> amount)
    const spentOnDay = {};
    monthExpenses.forEach(function (expense) {
        const day = new Date(expense.expense_date).getDate();
        spentOnDay[day] = (spentOnDay[day] || 0) + Number(expense.amount);
    });

    // Running cumulative total across every day of the month so far
    // (day 1 -> today). Days beyond today are left as null so the line
    // simply stops "now" instead of drawing a flat guess forward.
    const dayLabels = [];
    const actualCumulative = [];
    let running = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        dayLabels.push(day);
        if (day <= today) {
            running += (spentOnDay[day] || 0);
            actualCumulative.push(running);
        } else {
            actualCumulative.push(null);
        }
    }

    const datasets = [{
        label: "What you've actually spent",
        data: actualCumulative,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.12)',
        fill: true,
        tension: 0.25,
        spanGaps: true
    }];

    // Reference line: what spending would look like if spread perfectly
    // evenly across the whole month. This is what ties the chart to the
    // Daily Spending Guide card above - if the solid line is above this
    // dashed line, spending is running ahead of an even pace.
    if (currentBudget) {
        const total = Number(currentBudget.total_budget) || 0;
        const savingsGoal = Number(currentBudget.savings_goal) || 0;
        const spendableTotal = Math.max(total - savingsGoal, 0);
        const perDay = spendableTotal / daysInMonth;

        datasets.push({
            label: 'Even pace for your budget',
            data: dayLabels.map(function (day) { return perDay * day; }),
            borderColor: '#9ca3af',
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            tension: 0
        });
    }

    trendChartInstance = new Chart(canvas, {
        type: 'line',
        data: { labels: dayLabels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
            },
            scales: {
                y: { beginAtZero: true },
                x: { title: { display: true, text: 'Day of the month', font: { size: 10 } } }
            }
        }
    });
}

console.log("✅ charts.js loaded successfully");
