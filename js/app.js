// ============================================
// RupeeTracker - Main Application File
// ============================================

let supabase = null;
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

// Wait for Supabase library to load
setTimeout(function() {
    if (window.supabase) {
        console.log("✅ Supabase library loaded successfully");
        initializeApp();
    } else {
        console.error("❌ Supabase library failed to load");
    }
}, 500);

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

        // Keep a reference to the raw library before we overwrite
        // window.supabase with the client instance below. auth.js reuses
        // this same client rather than trying to build its own.
        const supabaseLib = window.supabase;

        // Create Supabase client
        supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Connected to Supabase");

        // Export the CLIENT to window so other files (auth.js, budget.js, etc.)
        // can call `supabase.from(...)` / `supabase.auth...` directly.
        window.supabase = supabase;
        console.log("✅ Exported supabase client to window.supabase");

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
    supabase.auth.onAuthStateChange(async function(event, session) {
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
        const { data: budgetData, error: budgetError } = await supabase
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
        const { data: expenseData, error: expenseError } = await supabase
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
    const modal = document.getElementById('budget-modal');
    if (modal) modal.classList.remove('hidden');

    if (typeof populateCategoryCheckboxes === 'function') {
        populateCategoryCheckboxes();
    }
}

function closeBudgetModal() {
    const modal = document.getElementById('budget-modal');
    if (modal) modal.classList.add('hidden');
}

function openExpenseForm() {
    const modal = document.getElementById('expense-modal');
    if (modal) modal.classList.remove('hidden');
    
    const expenseDateInput = document.getElementById('expense-date');
    if (expenseDateInput) {
        expenseDateInput.value = new Date().toISOString().split('T')[0];
    }
}

function closeExpenseModal() {
    const modal = document.getElementById('expense-modal');
    if (modal) modal.classList.add('hidden');
}

console.log("✅ app.js loaded successfully");
