// ============================================
// RupeeTracker - Authentication Module
// ============================================
// Handles login and registration
// Called by: index.html form submissions
// Uses: supabase (from app.js)
// ============================================

// ============================================
// 1. AUTH FORM STATE
// ============================================

let isLoginMode = true; // Track if showing login or register

// ============================================
// 2. WAIT FOR SUPABASE TO INITIALIZE
// ============================================

// We need to wait for app.js to create the supabase connection
// This function checks every 100ms until supabase exists

function waitForSupabase() {
    return new Promise(function(resolve) {
        function check() {
            if (window.supabase) {
                console.log("✅ auth.js: Supabase is ready!");
                resolve(window.supabase);
            } else {
                console.log("⏳ auth.js: Waiting for Supabase...");
                setTimeout(check, 100); // Check again in 100ms
            }
        }
        check();
    });
}

// Start waiting for Supabase
waitForSupabase().then(function() {
    initializeAuthHandlers();
});

// ============================================
// 3. INITIALIZE AUTH HANDLERS
// ============================================

function initializeAuthHandlers() {
    console.log("🔐 Initializing auth handlers...");

    // ============================================
    // GET FORM ELEMENTS
    // ============================================

    const authForm = document.getElementById('auth-form');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authBtn = document.getElementById('auth-btn');
    const authSwitchBtn = document.getElementById('auth-switch-btn');

    // ============================================
    // FORM SUBMISSION HANDLER
    // ============================================

    if (authForm) {
        authForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevent page reload
            
            console.log("🔐 Auth form submitted");

            // Get email and password from inputs
            const email = authEmail.value.trim();
            const password = authPassword.value;

            // Validate inputs
            if (!email || !password) {
                showAuthError("Please enter email and password");
                return;
            }

            if (password.length < 6) {
                showAuthError("Password must be at least 6 characters");
                return;
            }

            // Disable button during request
            authBtn.disabled = true;
            authBtn.textContent = isLoginMode ? "Logging in..." : "Creating account...";

            try {
                if (isLoginMode) {
                    // USER IS LOGGING IN
                    console.log("📝 Attempting login...");
                    await handleLogin(email, password);
                } else {
                    // USER IS REGISTERING
                    console.log("📝 Attempting registration...");
                    await handleRegister(email, password);
                }
            } catch (error) {
                console.error("❌ Auth error:", error);
                showAuthError(error.message || "Authentication failed");
            } finally {
                // Re-enable button
                authBtn.disabled = false;
                authBtn.textContent = isLoginMode ? "Login" : "Register";
            }
        });
    }

    // ============================================
    // LOGIN HANDLER
    // ============================================

    async function handleLogin(email, password) {
        const supabase = window.supabase;
        
        if (!supabase) {
            throw new Error("Supabase not initialized. Please refresh the page.");
        }

        console.log("🔑 Logging in as:", email);

        // Call Supabase authentication
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            // Authentication failed
            console.error("❌ Login failed:", error.message);
            throw error;
        }

        // Authentication successful
        console.log("✅ Login successful! User ID:", data.user.id);
        console.log("✅ Session created");

        // Clear form
        authForm.reset();
        clearAuthError();

        // app.js auth listener will fire and show dashboard
        // No need to do anything here - app.js handles it!
    }

    // ============================================
    // REGISTER HANDLER
    // ============================================

    async function handleRegister(email, password) {
        const supabase = window.supabase;
        
        if (!supabase) {
            throw new Error("Supabase not initialized. Please refresh the page.");
        }

        console.log("👤 Registering new user:", email);

        // Call Supabase authentication
        // This creates a new user account
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            // Registration failed
            console.error("❌ Registration failed:", error.message);
            throw error;
        }

        // Registration successful
        console.log("✅ Registration successful! User ID:", data.user.id);

        // Clear form
        authForm.reset();
        clearAuthError();

        // Show success message
        showAuthSuccess("Account created! Logging you in...");

        // app.js auth listener will fire and show dashboard
        // No need to do anything here - app.js handles it!
    }

    // ============================================
    // SWITCH BETWEEN LOGIN AND REGISTER
    // ============================================

    if (authSwitchBtn) {
        authSwitchBtn.addEventListener('click', function(event) {
            event.preventDefault();

            // Toggle mode
            isLoginMode = !isLoginMode;

            console.log("🔄 Switched to:", isLoginMode ? "Login" : "Register");

            // Update button text
            authBtn.textContent = isLoginMode ? "Login" : "Register";

            // Update switch button text
            if (isLoginMode) {
                authSwitchBtn.textContent = "Register";
            } else {
                authSwitchBtn.textContent = "Login";
            }

            // Update form heading
            const heading = document.querySelector('.bg-white h3') || 
                           document.querySelector('#auth-page h3');
            if (heading) {
                heading.textContent = isLoginMode ? "Login to RupeeTracker" : "Create New Account";
            }

            // Clear any error messages
            clearAuthError();
            
            // Clear form
            authForm.reset();
        });
    }

    // ============================================
    // ERROR AND SUCCESS MESSAGES
    // ============================================

    function showAuthError(message) {
        // Get error container or create one
        let errorDiv = document.getElementById('auth-error');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'auth-error';
            errorDiv.style.cssText = `
                background-color: #fee2e2;
                color: #991b1b;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 16px;
                border-left: 4px solid #dc2626;
            `;
            
            // Insert before form
            if (authForm) {
                authForm.parentNode.insertBefore(errorDiv, authForm);
            }
        }
        
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        console.error("❌ Error shown to user:", message);
    }

    function showAuthSuccess(message) {
        // Get success container or create one
        let successDiv = document.getElementById('auth-success');
        
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.id = 'auth-success';
            successDiv.style.cssText = `
                background-color: #dcfce7;
                color: #166534;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 16px;
                border-left: 4px solid #22c55e;
            `;
            
            // Insert before form
            if (authForm) {
                authForm.parentNode.insertBefore(successDiv, authForm);
            }
        }
        
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        console.log("✅ Success shown to user:", message);
    }

    function clearAuthError() {
        const errorDiv = document.getElementById('auth-error');
        const successDiv = document.getElementById('auth-success');
        
        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';
    }

    // ============================================
    // LOGOUT HANDLER
    // ============================================

    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            console.log("👋 User clicked logout");

            try {
                const supabase = window.supabase;
                
                if (!supabase) {
                    console.error("❌ Supabase not available");
                    return;
                }

                // Call Supabase logout
                const { error } = await supabase.auth.signOut();

                if (error) {
                    console.error("❌ Logout error:", error);
                    showAuthError("Logout failed. Please try again.");
                    return;
                }

                console.log("✅ Logout successful");
                // app.js auth listener will fire and show login page

            } catch (error) {
                console.error("❌ Unexpected logout error:", error);
                showAuthError("An error occurred during logout");
            }
        });
    }

    console.log("✅ Auth handlers initialized successfully");
}

// ============================================
// INITIALIZATION COMPLETE
// ============================================

console.log("✅ auth.js loaded successfully");
console.log("📌 Waiting for Supabase to initialize...");