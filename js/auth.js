// ============================================
// RupeeTracker - Auth Module
// ============================================

let isLoginMode = true;

// Wait a moment then setup
setTimeout(setupAuth, 1500);

function setupAuth() {
    console.log("🔐 Setting up auth handlers");
    
    const form = document.getElementById('auth-form');
    const email = document.getElementById('auth-email');
    const password = document.getElementById('auth-password');
    const btn = document.getElementById('auth-btn');
    const switchBtn = document.getElementById('auth-switch-btn');

    if (!form) {
        console.error("❌ Form not found");
        return;
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailVal = email.value.trim();
        const passVal = password.value;

        if (!emailVal || !passVal) {
            alert("Enter email and password");
            return;
        }

        if (passVal.length < 6) {
            alert("Password must be 6+ characters");
            return;
        }

        btn.disabled = true;
        btn.textContent = isLoginMode ? "Logging in..." : "Registering...";

        try {
            // Get Supabase from window
            const supabaseLib = window.supabase;
            
            if (!supabaseLib) {
                throw new Error("Supabase library not loaded");
            }

            // Get the createClient function
            const { createClient } = supabaseLib;
            
            if (!createClient) {
                throw new Error("createClient not found");
            }

            // Create client
            const url = process.env.VITE_SUPABASE_URL;
            const key = process.env.VITE_SUPABASE_ANON_KEY;

            if (!url || !key) {
                throw new Error("Missing Supabase credentials");
            }

            const client = createClient(url, key);

            if (isLoginMode) {
                console.log("🔑 Logging in...");
                const { error } = await client.auth.signInWithPassword({
                    email: emailVal,
                    password: passVal
                });
                if (error) throw error;
                console.log("✅ Login success");
            } else {
                console.log("📝 Registering...");
                const { error } = await client.auth.signUp({
                    email: emailVal,
                    password: passVal
                });
                if (error) throw error;
                console.log("✅ Registration success");
                alert("Account created!");
            }

            form.reset();

        } catch (err) {
            console.error("❌ Error:", err);
            alert("Error: " + (err.message || "Auth failed"));
        } finally {
            btn.disabled = false;
            btn.textContent = isLoginMode ? "Login" : "Register";
        }
    });

    // Switch mode
    if (switchBtn) {
        switchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            btn.textContent = isLoginMode ? "Login" : "Register";
            switchBtn.textContent = isLoginMode ? "Register" : "Login";
            form.reset();
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const client = window.supabase.createClient(
                    process.env.VITE_SUPABASE_URL,
                    process.env.VITE_SUPABASE_ANON_KEY
                );
                await client.auth.signOut();
                console.log("✅ Logged out");
            } catch (err) {
                alert("Logout error: " + err.message);
            }
        });
    }

    console.log("✅ Auth ready");
}

console.log("✅ auth.js loaded");