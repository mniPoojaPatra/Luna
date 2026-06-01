import DB from './db.js';

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
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userVal = document.getElementById('login-username').value;
        const passVal = document.getElementById('login-password').value;
        const alertBox = document.getElementById('login-alert');

        if (!userVal || !passVal) {
          this.showAlert(alertBox, 'Please fill in all fields', 'error');
          return;
        }

        const res = DB.authenticateUser(userVal, passVal);
        if (res.success) {
          loginForm.reset();
          if (this.onLoginSuccess) this.onLoginSuccess(userVal);
        } else {
          this.showAlert(alertBox, res.message, 'error');
        }
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userVal = document.getElementById('signup-username').value;
        const passVal = document.getElementById('signup-password').value;
        const passConfVal = document.getElementById('signup-confirm-password').value;
        const alertBox = document.getElementById('signup-alert');

        if (!userVal || !passVal || !passConfVal) {
          this.showAlert(alertBox, 'Please fill in all fields', 'error');
          return;
        }

        if (userVal.length < 3) {
          this.showAlert(alertBox, 'Username must be at least 3 characters', 'error');
          return;
        }

        if (passVal.length < 4) {
          this.showAlert(alertBox, 'Password must be at least 4 characters', 'error');
          return;
        }

        if (passVal !== passConfVal) {
          this.showAlert(alertBox, 'Passwords do not match', 'error');
          return;
        }

        const res = DB.registerUser(userVal, passVal);
        if (res.success) {
          this.showAlert(alertBox, 'Account created! Switching to Login...', 'success');
          signupForm.reset();
          
          setTimeout(() => {
            signupPanel.style.display = 'none';
            loginPanel.style.display = 'block';
            this.clearAlerts();
            document.getElementById('login-username').value = userVal;
          }, 1500);
        } else {
          this.showAlert(alertBox, res.message, 'error');
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
