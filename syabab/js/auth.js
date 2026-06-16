document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    const authContainer = document.getElementById('nav-auth-container');
    
    if (userStr && authContainer) {
        try {
            const user = JSON.parse(userStr);
            // Get first name
            const firstName = user.name ? user.name.split(' ')[0] : 'Profil';
            
            authContainer.innerHTML = `
                <a href="profil.html" class="profile-logo-btn">
                    <div class="profile-circle">
                        <i class="fa-solid fa-user"></i>
                    </div>
                </a>
            `;

            const btnLogout = document.getElementById('btn-logout-nav');
            if (btnLogout) {
                btnLogout.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'index.html';
                });
            }
        } catch (e) {
            console.error("Invalid user data in localStorage");
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
    }
});
