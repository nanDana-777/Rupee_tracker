// ============================================
// RupeeTracker - Charts Module
// Renders the three Chart.js visualizations:
//   - budgetChart:  planned allocation by category (pie)
//   - expenseChart: actual spend by category (pie)
//   - trendChart:   cumulative spend over the current month (line)
// ============================================

let budgetChartInstance = null;
let expenseChartInstance = null;
let trendChartInstance = null;

const CHART_COLORS = [
    '#059669', '#0891b2', '#7c3aed', '#db2777', '#d97706',
    '#dc2626', '#4f46e5', '#0d9488', '#65a30d', '#c026d3',
    '#ea580c', '#2563eb', '#71717a'
];

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
                backgroundColor: labels.map(function (_, i) { return CHART_COLORS[i % CHART_COLORS.length]; })
            }]
        },
        options: {
            responsive: true,
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
                backgroundColor: labels.map(function (_, i) { return CHART_COLORS[i % CHART_COLORS.length]; })
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
        }
    });
}

function renderTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (trendChartInstance) trendChartInstance.destroy();
    if (!currentExpenses || currentExpenses.length === 0) return;

    // Group this month's expenses by date, then build a running
    // cumulative total so the line reads as "total spent so far".
    const now = new Date();
    const monthExpenses = currentExpenses.filter(function (expense) {
        const d = new Date(expense.expense_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    if (monthExpenses.length === 0) return;

    const byDate = {};
    monthExpenses.forEach(function (expense) {
        byDate[expense.expense_date] = (byDate[expense.expense_date] || 0) + Number(expense.amount);
    });

    const sortedDates = Object.keys(byDate).sort();

    let running = 0;
    const cumulative = sortedDates.map(function (date) {
        running += byDate[date];
        return running;
    });

    trendChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: sortedDates.map(formatDate),
            datasets: [{
                label: 'Cumulative spend (₹)',
                data: cumulative,
                borderColor: '#059669',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                fill: true,
                tension: 0.25
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

console.log("✅ charts.js loaded successfully");
