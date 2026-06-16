async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const password = form.password.value.trim();
    const confirmPassword = form.confirm_password.value.trim();
    const termsChecked = form.terms.checked;

    if (!termsChecked) {
        alert('Silakan setujui syarat dan ketentuan terlebih dahulu.');
        return;
    }

    if (password !== confirmPassword) {
        alert('Kata sandi dan konfirmasi tidak cocok.');
        return;
    }

    const submitBtn = form.querySelector('.btn-auth');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
    }

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert('Pendaftaran berhasil!');
            localStorage.setItem('user', JSON.stringify(result.user));
            if (result.token) {
                localStorage.setItem('token', result.token);
            }
            window.location.href = 'index.html';
        } else {
            alert(result.error || 'Pendaftaran gagal.');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Daftar <i class="fa-solid fa-arrow-right"></i>';
            }
        }
    } catch (error) {
        console.error('Register Error:', error);
        alert('Gagal terhubung ke server. Pastikan backend menyala.');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Daftar <i class="fa-solid fa-arrow-right"></i>';
        }
    }
}

window.handleRegister = handleRegister;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        const targetId = toggle.dataset.target;
        const target = document.getElementById(targetId);
        if (!target) return;

        toggle.addEventListener('click', () => {
            const isPassword = target.type === 'password';
            target.type = isPassword ? 'text' : 'password';
            toggle.classList.toggle('fa-eye', isPassword);
            toggle.classList.toggle('fa-eye-slash', !isPassword);
        });
    });
});
