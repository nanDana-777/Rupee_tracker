// ============================================
// RupeeTracker - Main Application File
// ============================================

let sb = null;
let currentUser = null;
let currentUserId = null;
let currentBudget = null;
let currentExpenses = [];

const CATEGORIES = [
    "Food & Beverages",
    "Electricity Bills",
    "Water Bills",
    "Gas Cylinder/Piped",
    "Insurance Premia",
    "Internet & Phone Bills",
    "House Rent",
    "Property/Home Loan EMI",
    "Travel & Petrol",
    "Maid & Cook Salaries",
    "School Fees",
    "Medical & Pharmacy",
    "Other Expenses"
];

// Wait for the Supabase library (loaded via CDN <script> tag) to become
// available on window, then initialize. We POLL for this instead of using
// a fixed delay — a fixed delay is a race condition: on a slow connection
// the CDN script can take longer than the delay, and on a fast one (or
// with browser autofill submitting instantly) the user can act before the
// delay even elapses. Polling waits exactly as long as needed either way.
function waitForSupabaseLibrary(attemptsLeft) {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        console.log("✅ Supabase library loaded successfully");
        initializeApp();
        return;
    }
    if (attemptsLeft <= 0) {
        console.error("❌ Supabase library failed to load");
        return;
    }
    setTimeout(function () {
        waitForSupabaseLibrary(attemptsLeft - 1);
    }, 100);
}
waitForSupabaseLibrary(50); // retries every 100ms for up to ~5 seconds

// Initialize Supabase
//
// NOTE: this is a plain static site with no build step (no Vite/webpack),
// so there is no `process.env` in the browser — that was the root bug.
// The anon key below is meant to be public: it's safe to ship in client-side
// code as long as Row Level Security policies are the real access boundary
// (see the `budgets`/`expenses` RLS policies in the Supabase schema).
function initializeApp() {
    try {
        const SUPABASE_URL = "https://dzejmfhqcayeblgyhdex.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZWptZmhxY2F5ZWJsZ3loZGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjQxMTIsImV4cCI6MjA5OTcwMDExMn0.Pu2J-dLg8ojPqQHj8wm0ugBd9zVlYyV0CPzevYjxCQM";

        // Create the client into `sb`, WITHOUT touching window.supabase —
        // leaving the CDN library's own global alone is what avoids the
        // "Identifier 'supabase' has already been declared" collision.
        // auth.js / budget.js / expenses.js all reuse this same `sb`
        // top-level variable directly (classic <script> tags share one
        // global scope, so no window. prefix or import is needed).
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Connected to Supabase");

        // Let other scripts know the client is genuinely ready, instead of
        // making them guess with their own timeout (that's what caused the
        // "Supabase client not ready yet" error on fast/autofilled logins).
        window.supabaseReady = true;
        document.dispatchEvent(new Event('supabase-ready'));

        // Setup auth listener
        setupAuthListener();

        // Show login page
        showLoginPage();

    } catch (error) {
        console.error("❌ Error initializing app:", error);
    }
}

// Setup authentication listener
function setupAuthListener() {
    sb.auth.onAuthStateChange(async function(event, session) {
        console.log("🔐 Auth event:", event);

        if (session && session.user) {
            console.log("✅ User logged in:", session.user.id);
            
            currentUser = session.user;
            currentUserId = session.user.id;
            
            showDashboard();
            await loadUserData();

        } else {
            console.log("❌ User logged out");
            
            currentUser = null;
            currentUserId = null;
            currentBudget = null;
            currentExpenses = [];
            
            showLoginPage();
        }
    });
}

// Load user data
async function loadUserData() {
    try {
        if (!currentUserId) {
            console.error("❌ No user ID available");
            return;
        }

        console.log("📊 Loading user data...");

        // Fetch budget
        const { data: budgetData, error: budgetError } = await sb
            .from('budgets')
            .select('*')
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (budgetError) {
            console.error("❌ Error loading budget:", budgetError);
        } else if (budgetData) {
            currentBudget = budgetData;
            console.log("✅ Budget loaded");
        } else {
            console.log("ℹ️ No budget set up yet");
            currentBudget = null;
        }

        // Fetch expenses
        const { data: expenseData, error: expenseError } = await sb
            .from('expenses')
            .select('*')
            .eq('user_id', currentUserId)
            .order('expense_date', { ascending: false });

        if (expenseError) {
            console.error("❌ Error loading expenses:", expenseError);
        } else if (expenseData) {
            currentExpenses = expenseData;
            console.log("✅ Expenses loaded:", currentExpenses.length, "expenses");
        }

        // Render if functions exist
        if (typeof renderCharts === 'function') {
            renderCharts();
        }
        if (typeof populateExpenseTable === 'function') {
            populateExpenseTable();
        }
        if (typeof updateBudgetDisplay === 'function') {
            updateBudgetDisplay();
        }
        if (typeof populateCategorySelect === 'function') {
            populateCategorySelect();
        }
        if (typeof renderSmartPace === 'function') {
            renderSmartPace();
        }

    } catch (error) {
        console.error("❌ Error loading user data:", error);
    }
}

// Show login page
function showLoginPage() {
    const authPage = document.getElementById('auth-page');
    const appPage = document.getElementById('app-page');
    
    if (authPage) authPage.classList.remove('hidden');
    if (appPage) appPage.classList.add('hidden');
    
    console.log("👤 Showing login page");
}

// Show dashboard
function showDashboard() {
    const authPage = document.getElementById('auth-page');
    const appPage = document.getElementById('app-page');
    
    if (authPage) authPage.classList.add('hidden');
    if (appPage) appPage.classList.remove('hidden');
    
    console.log("📊 Showing dashboard");
}

// Navigation functions
function showDashboardSection() {
    const dashboardSection = document.getElementById('dashboard-section');
    const expensesSection = document.getElementById('expenses-section');
    
    if (dashboardSection) dashboardSection.classList.remove('hidden');
    if (expensesSection) expensesSection.classList.add('hidden');
}

function showExpenses() {
    const dashboardSection = document.getElementById('dashboard-section');
    const expensesSection = document.getElementById('expenses-section');
    
    if (dashboardSection) dashboardSection.classList.add('hidden');
    if (expensesSection) expensesSection.classList.remove('hidden');
}

// Modal functions
function openBudgetForm() {
    if (typeof populateCategoryCheckboxes === 'function') {
        populateCategoryCheckboxes();
    }
    openModal('budget-modal');
}

function closeBudgetModal() {
    closeModal('budget-modal');
}

function openExpenseForm() {
    // Adding fresh, not editing - clear any in-progress edit state so
    // the form is guaranteed blank and the submit button says "Add".
    if (typeof resetExpenseForm === 'function') resetExpenseForm();

    if (typeof populateCategorySelect === 'function') {
        populateCategorySelect();
    }

    const expenseDateInput = document.getElementById('expense-date');
    if (expenseDateInput) {
        expenseDateInput.value = new Date().toISOString().split('T')[0];
    }

    openModal('expense-modal');
}

function closeExpenseModal() {
    if (typeof resetExpenseForm === 'function') resetExpenseForm();
    closeModal('expense-modal');
}

console.log("✅ app.js loaded successfully");
