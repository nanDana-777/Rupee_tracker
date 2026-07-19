// ============================================
// RupeeTracker - Auth Module
// ============================================

let isLoginMode = true;

// Wire up handlers right away — the form elements already exist in the
// DOM (this script runs at the bottom of <body>), so there's no need to
// wait. Readiness of the *Supabase client* is handled separately below.
setupAuth();

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

    // Keep the submit button disabled until the Supabase client is
    // actually ready. This is what fixes the "Supabase client not ready
    // yet" error: instead of racing a fixed delay against however fast
    // the user (or browser autofill) submits the form, the button simply
    // can't be clicked until app.js confirms the client exists.
    function enableAuthButton() {
        if (btn) {
            btn.disabled = false;
            btn.textContent = isLoginMode ? "Login" : "Register";
        }
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Loading...";
    }

    if (window.supabaseReady) {
        enableAuthButton();
    } else {
        document.addEventListener('supabase-ready', enableAuthButton, { once: true });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailVal = email.value.trim();
        const passVal = password.value;

        if (!emailVal || !passVal) {
            showToast("Enter email and password", "error");
            return;
        }

        if (passVal.length < 6) {
            showToast("Password must be 6+ characters", "error");
            return;
        }

        // Defensive check (belt-and-suspenders): the button being disabled
        // until 'supabase-ready' should already prevent this, but guard
        // against it anyway in case of a hard-reload edge case.
        if (!sb || typeof sb.auth === 'undefined') {
            showToast("Still connecting to the server — please wait a moment and try again", "error");
            return;
        }

        btn.disabled = true;
        btn.textContent = isLoginMode ? "Logging in..." : "Registering...";

        try {
            // Reuse the single Supabase client app.js already created
            // (it's a shared top-level `let sb` — visible here directly
            // since classic <script> tags share one global scope).
            if (isLoginMode) {
                console.log("🔑 Logging in...");
                const { error } = await sb.auth.signInWithPassword({
                    email: emailVal,
                    password: passVal
                });
                if (error) throw error;
                console.log("✅ Login success");
            } else {
                console.log("📝 Registering...");
                const { error } = await sb.auth.signUp({
                    email: emailVal,
                    password: passVal
                });
                if (error) throw error;
                console.log("✅ Registration success");
                showToast("Account created! You're logged in.", "success");
                // Switch the form to Login mode so a second submit can't
                // accidentally call signUp() again on the same email —
                // that's what caused the rate-limit errors.
                isLoginMode = true;
                btn.textContent = "Login";
                if (switchBtn) switchBtn.textContent = "Register";
            }

            form.reset();

        } catch (err) {
            console.error("❌ Error:", err);
            showToast("Error: " + (err.message || "Auth failed"), "error");
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
                await sb.auth.signOut();
                console.log("✅ Logged out");
            } catch (err) {
                showToast("Logout error: " + err.message, "error");
            }
        });
    }

    console.log("✅ Auth ready");
}

console.log("✅ auth.js loaded");
