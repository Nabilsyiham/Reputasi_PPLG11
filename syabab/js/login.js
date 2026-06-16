// Toggle password visibility
const togglePassword = document.querySelector('.toggle-password');
const passwordInput = document.querySelector('#password');

if(togglePassword) {
    togglePassword.addEventListener('click', function (e) {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}

// Modal Logic
const modal = document.getElementById("registerModal");
const btnDaftar = document.getElementById("btn-daftar-modal");
const spanClose = document.getElementsByClassName("close-modal")[0];

if(btnDaftar) {
    btnDaftar.onclick = function(e) {
        e.preventDefault();
        modal.style.display = "flex";
    }
}

if(spanClose) {
    spanClose.onclick = function() {
        modal.style.display = "none";
    }
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Form Validation Logic
const authForm = document.querySelector('.auth-form');
const submitBtn = document.querySelector('.btn-auth');
const inputs = authForm.querySelectorAll('[required]');

function validateForm() {
    let isValid = true;
    inputs.forEach(input => {
        if (!input.value.trim()) isValid = false;
    });
    if (submitBtn) submitBtn.disabled = !isValid;
}

if (authForm) {
    authForm.addEventListener('input', validateForm);
    validateForm(); // Initial check
}

async function handleLogin(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menunggu...';
    }

    const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';
    try {
        const response = await fetch(API_BASE + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify(result.user));
            if(result.token) localStorage.setItem('token', result.token);
            window.location.href = 'index.html';
        } else {
            alert(result.error || "Login gagal");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Masuk <i class="fa-solid fa-arrow-right"></i>';
            }
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("Gagal terhubung ke server");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Masuk <i class="fa-solid fa-arrow-right"></i>';
        }
    }
}

if (authForm) {
    authForm.addEventListener('submit', handleLogin);
}
