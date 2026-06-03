import DB, { supabase } from './db.js';

const Auth = {
  onLoginSuccess: null, // Callback when login succeeds

  init(onLoginSuccessCallback) {
    this.onLoginSuccess = onLoginSuccessCallback;
    this.bindEvents();
  },

  bindEvents() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    const showSignupLink = document.getElementById('link-show-signup');
    const showLoginLink = document.getElementById('link-show-login');
    
    const loginPanel = document.getElementById('auth-panel-login');
    const signupPanel = document.getElementById('auth-panel-signup');
    
    // Toggle screens
    if (showSignupLink && showLoginLink) {
      showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginPanel.style.display = 'none';
        signupPanel.style.display = 'block';
        this.clearAlerts();
      });
      
      showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupPanel.style.display = 'none';
        loginPanel.style.display = 'block';
        this.clearAlerts();
      });
    }

    // Submit handlers
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailVal = document.getElementById('login-email').value;
        const passVal = document.getElementById('login-password').value;
        const alertBox = document.getElementById('login-alert');

        if (!emailVal || !passVal) {
          this.showAlert(alertBox, 'Please fill in all fields', 'error');
          return;
        }

        this.showAlert(alertBox, 'Stepping inside...', 'success');

        const res = await DB.authenticateUser(emailVal, passVal);
        if (res.success) {
          loginForm.reset();
          if (this.onLoginSuccess) this.onLoginSuccess(DB.getActiveUser());
        } else {
          this.showAlert(alertBox, res.message, 'error');
        }
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailVal = document.getElementById('signup-email').value;
        const userVal = document.getElementById('signup-username').value;
        const passVal = document.getElementById('signup-password').value;
        const passConfVal = document.getElementById('signup-confirm-password').value;
        const alertBox = document.getElementById('signup-alert');

        if (!emailVal || !userVal || !passVal || !passConfVal) {
          this.showAlert(alertBox, 'Please fill in all fields', 'error');
          return;
        }

        if (userVal.length < 3) {
          this.showAlert(alertBox, 'Username must be at least 3 characters', 'error');
          return;
        }

        if (passVal.length < 6) {
          this.showAlert(alertBox, 'Password must be at least 6 characters', 'error');
          return;
        }

        if (passVal !== passConfVal) {
          this.showAlert(alertBox, 'Passwords do not match', 'error');
          return;
        }

        this.showAlert(alertBox, 'Forging space...', 'success');

        const res = await DB.registerUser(emailVal, passVal, userVal);
        if (res.success) {
          this.showAlert(alertBox, 'Space forged! Please check email or step inside.', 'success');
          signupForm.reset();
          
          setTimeout(() => {
            signupPanel.style.display = 'none';
            loginPanel.style.display = 'block';
            this.clearAlerts();
            document.getElementById('login-email').value = emailVal;
          }, 2000);
        } else {
          this.showAlert(alertBox, res.message, 'error');
        }
      });
    }

    // Google Login button binding
    const btnGoogle = document.getElementById('btn-google-login');
    if (btnGoogle) {
      btnGoogle.addEventListener('click', async () => {
        if (supabase) {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: window.location.origin
            }
          });
          if (error) {
            alert('Google Auth error: ' + error.message);
          }
        } else {
          alert('Supabase is not configured yet.');
        }
      });
    }
  },

  showAlert(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = `auth-alert ${type}`;
  },

  clearAlerts() {
    ['login-alert', 'signup-alert'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '';
        el.className = 'auth-alert';
      }
    });
  }
};

export default Auth;
