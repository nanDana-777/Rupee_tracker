// ============================================
// RupeeTracker - Authentication Module
// ============================================

let isLoginMode = true;

// Wait for Supabase and form elements to be ready
setTimeout(function() {
    setupAuthHandlers();
}, 1000);

function setupAuthHandlers() {
    const authForm = document.getElementById('auth-form');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authBtn = document.getElementById('auth-btn');
    const authSwitchBtn = document.getElementById('auth-switch-btn');

    if (!authForm) {
        console.error("❌ Auth form not found in DOM");
        return;
    }

    console.log("✅ Auth form found, setting up handlers");

    // ============================================
    // FORM SUBMISSION
    // ============================================
    
    authForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        console.log("🔐 Form submitted, isLoginMode:", isLoginMode);

        const email = authEmail.value.trim();
        const password = authPassword.value;

        if (!email || !password) {
            alert("Please enter email and password");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        authBtn.disabled = true;
        authBtn.textContent = isLoginMode ? "Logging in..." : "Creating account...";

        try {
            if (!window.supabase) {
                throw new Error("Supabase not initialized");
            }

            if (isLoginMode) {
                console.log("🔑 Attempting login with:", email);
                const { data, error } = await window.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    console.error("❌ Login error:", error);
                    alert("Login failed: " + error.message);
                    return;
                }

                console.log("✅ Login successful!");
                authForm.reset();

            } else {
                console.log("👤 Attempting registration with:", email);
                const { data, error } = await window.supabase.auth.signUp({
                    email: email,
                    password: password
                });

                if (error) {
                    console.error("❌ Registration error:", error);
                    alert("Registration failed: " + error.message);
                    return;
                }

                console.log("✅ Registration successful!");
                alert("Account created! You should be logged in now.");
                authForm.reset();
            }

        } catch (error) {
            console.error("❌ Auth error:", error);
            alert("Error: " + error.message);
        } finally {
            authBtn.disabled = false;
            authBtn.textContent = isLoginMode ? "Login" : "Register";
        }
    });

    // ============================================
    // SWITCH BETWEEN LOGIN AND REGISTER
    // ============================================

    if (authSwitchBtn) {
        authSwitchBtn.addEventListener('click', function(event) {
            event.preventDefault();
            isLoginMode = !isLoginMode;

            authBtn.textContent = isLoginMode ? "Login" : "Register";
            authSwitchBtn.textContent = isLoginMode ? "Register" : "Login";

            authForm.reset();
            console.log("🔄 Switched to:", isLoginMode ? "Login mode" : "Register mode");
        });
    }

    // ============================================
    // LOGOUT
    // ============================================

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            console.log("👋 Logging out...");

            try {
                if (!window.supabase) {
                    console.error("❌ Supabase not available");
                    return;
                }

                const { error } = await window.supabase.auth.signOut();

                if (error) {
                    console.error("❌ Logout error:", error);
                    alert("Logout failed: " + error.message);
                    return;
                }

                console.log("✅ Logout successful!");
                // app.js will handle showing login page

            } catch (error) {
                console.error("❌ Error during logout:", error);
                alert("Error: " + error.message);
            }
        });
    }

    console.log("✅ Auth handlers setup complete");
}

console.log("✅ auth.js loaded");