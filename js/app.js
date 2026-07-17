// ============================================
// RupeeTracker - Main Application File
// ============================================
// This file MUST load FIRST in index.html
// It initializes Supabase and sets up the app
// ============================================

// ============================================
// 1. GLOBAL VARIABLES (accessible to all files)
// ============================================

let supabase = null;           // Supabase client (created below)
let currentUser = null;        // Currently logged-in user
let currentUserId = null;      // User's ID (for database queries)
let currentBudget = null;      // User's budget object
let currentExpenses = [];       // Array of user's expenses

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

// ============================================
// 2. WAIT FOR SUPABASE LIBRARY TO LOAD
// ============================================

// The Supabase library loads from CDN asynchronously
// We need to wait for it to be available before using it

setTimeout(function() {
    // Check if window.supabase exists (library loaded from CDN)
    if (window.supabase) {
        console.log("✅ Supabase library loaded successfully");
        initializeApp();
    } else {
        console.error("❌ Supabase library failed to load");
    }
}, 500); // Wait 500ms for CDN to load

// ============================================
// 3. INITIALIZE SUPABASE CONNECTION
// ============================================

function initializeApp() {
    try {
        // Read environment variables
        // In local: from .env file
        // In Vercel: from dashboard environment variables
        const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

        // Validate credentials exist
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error("❌ Supabase credentials not found in environment variables!");
            console.error("Make sure .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
            return;
        }

        // Create Supabase client
        // This is the object all other files will use
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Connected to Supabase");

        // Set up authentication state listener
        setupAuthListener();

        // Initialize UI (show login page)
        showLoginPage();

    } catch (error) {
        console.error("❌ Error initializing app:", error);
    }
}

// ============================================
// 4. AUTHENTICATION STATE LISTENER
// ============================================

function setupAuthListener() {
    // supabase.auth.onAuthStateChange listens for auth events
    // Runs when:
    // - User logs in
    // - User logs out
    // - Session changes
    // - Page loads (checks if user already logged in)

    supabase.auth.onAuthStateChange(async function(event, session) {
        console.log("🔐 Auth event:", event);

        if (session && session.user) {
            // User is logged in
            console.log("✅ User logged in:", session.user.id);
            
            currentUser = session.user;
            currentUserId = session.user.id;
            
            // Show dashboard, hide login
            showDashboard();
            
            // Load user's data from database
            await loadUserData();

        } else {
            // User is logged out
            console.log("❌ User logged out");
            
            currentUser = null;
            currentUserId = null;
            currentBudget = null;
            currentExpenses = [];
            
            // Show login, hide dashboard
            showLoginPage();
        }
    });
}

// ============================================
// 5. LOAD USER DATA FROM DATABASE
// ============================================

async function loadUserData() {
    try {
        if (!currentUserId) {
            console.error("❌ No user ID available");
            return;
        }

        console.log("📊 Loading user data for ID:", currentUserId);

        // Fetch budget from database
        // .select('*') = get all columns
        // .eq('user_id', currentUserId) = where user_id matches
        // .maybeSingle() = expect 0 or 1 result
        const { data: budgetData, error: budgetError } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (budgetError) {
            console.error("❌ Error loading budget:", budgetError);
        } else if (budgetData) {
            currentBudget = budgetData;
            console.log("✅ Budget loaded:", currentBudget);
        } else {
            console.log("ℹ️ No budget set up yet");
            currentBudget = null;
        }

        // Fetch expenses from database
        // .order('expense_date', { ascending: false }) = sort by date, newest first
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

        // Notify other files that data is loaded
        // They can now use currentBudget and currentExpenses
        if (window.renderCharts) {
            console.log("📈 Rendering charts...");
            window.renderCharts();
        }
        if (window.populateExpenseTable) {
            console.log("📋 Populating expense table...");
            window.populateExpenseTable();
        }
        if (window.updateBudgetDisplay) {
            console.log("💰 Updating budget display...");
            window.updateBudgetDisplay();
        }

    } catch (error) {
        console.error("❌ Unexpected error loading user data:", error);
    }
}

// ============================================
// 6. UI DISPLAY FUNCTIONS
// ============================================

function showLoginPage() {
    const authPage = document.getElementById('auth-page');
    const appPage = document.getElementById('app-page');
    
    if (authPage) authPage.classList.remove('hidden');
    if (appPage) appPage.classList.add('hidden');
    
    console.log("👤 Showing login page");
}

function showDashboard() {
    const authPage = document.getElementById('auth-page');
    const appPage = document.getElementById('app-page');
    
    if (authPage) authPage.classList.add('hidden');
    if (appPage) appPage.classList.remove('hidden');
    
    console.log("📊 Showing dashboard");
}

// ============================================
// 7. GLOBAL FUNCTIONS (used by other files)
// ============================================

// These functions are called by other JavaScript files
// They're defined here so all files can access them

function showDashboardSection() {
    const dashboardSection = document.getElementById('dashboard-section');
    const expensesSection = document.getElementById('expenses-section');
    
    if (dashboardSection) dashboardSection.classList.remove('hidden');
    if (expensesSection) expensesSection.classList.add('hidden');
}

function showExpensesSection() {
    const dashboardSection = document.getElementById('dashboard-section');
    const expensesSection = document.getElementById('expenses-section');
    
    if (dashboardSection) dashboardSection.classList.add('hidden');
    if (expensesSection) expensesSection.classList.remove('hidden');
}

function openBudgetModal() {
    const modal = document.getElementById('budget-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeBudgetModal() {
    const modal = document.getElementById('budget-modal');
    if (modal) modal.classList.add('hidden');
}

function openExpenseModal() {
    const modal = document.getElementById('expense-modal');
    if (modal) modal.classList.remove('hidden');
    
    // Set date to today
    const expenseDateInput = document.getElementById('expense-date');
    if (expenseDateInput) {
        expenseDateInput.value = new Date().toISOString().split('T')[0];
    }
}

function closeExpenseModal() {
    const modal = document.getElementById('expense-modal');
    if (modal) modal.classList.add('hidden');
}

// ============================================
// 8. EXPORT SUPABASE FOR OTHER FILES
// ============================================

// Make supabase available globally
window.supabase = supabase;
window.currentUser = currentUser;
window.currentUserId = currentUserId;
window.currentBudget = currentBudget;
window.currentExpenses = currentExpenses;
window.CATEGORIES = CATEGORIES;

// Make functions available globally
window.showDashboardSection = showDashboardSection;
window.showExpensesSection = showExpensesSection;
window.openBudgetModal = openBudgetModal;
window.closeBudgetModal = closeBudgetModal;
window.openExpenseModal = openExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.loadUserData = loadUserData;

// ============================================
// 9. INITIALIZATION COMPLETE
// ============================================

console.log("✅ app.js loaded successfully");
console.log("📌 App is ready. Waiting for user action...");