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
            // Reuse the single Supabase client app.js already created.
            // (Previously this tried to pull `createClient` back off
            // `window.supabase` — but by the time auth.js runs, app.js has
            // already overwritten `window.supabase` with the client
            // *instance*, which has no `.createClient` method. That, plus
            // the same process.env bug, is why login/register always failed.)
            const client = window.supabase;

            if (!client || typeof client.auth === 'undefined') {
                throw new Error("Supabase client not ready yet — please wait a moment and try again");
            }

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
                await window.supabase.auth.signOut();
                console.log("✅ Logged out");
            } catch (err) {
                alert("Logout error: " + err.message);
            }
        });
    }

    console.log("✅ Auth ready");
}

console.log("✅ auth.js loaded");
