// Get modal elements
const modal = document.getElementById("registerModal");
const btnDaftar = document.getElementById("btn-daftar-modal");
const spanClose = document.getElementsByClassName("close-modal")[0];

// When user clicks 'Daftar' link in dropdown, show modal
if (btnDaftar) {
    btnDaftar.onclick = function(e) {
        e.preventDefault(); // Prevent navigating to #
        modal.style.display = "flex";
    }
}

// Close modal when X is clicked
if (spanClose) {
    spanClose.onclick = function() {
        modal.style.display = "none";
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Fetch Komunitas Data
const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';

async function loadKomunitas() {
    const container = document.getElementById('komunitasContainer');
    try {
        const response = await fetch(`${API_BASE}/api/komunitas`, {
            headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        
        if (data.error) {
            container.innerHTML = `<div style="text-align:center; color:red; grid-column: 1 / -1;">Error: ${data.error}</div>`;
            return;
        }
        
        if (!data.length) {
            container.innerHTML = `<div style="text-align:center; color:gray; grid-column: 1 / -1; padding:2rem;">Belum ada komunitas yang terdaftar.</div>`;
            return;
        }

        container.innerHTML = ''; // Clear loading
        
        // Colors for gradient backgrounds
        const gradients = [
            'linear-gradient(135deg, #1e293b, #0f172a)',
            'linear-gradient(135deg, #475569, #9ca3af)',
            'linear-gradient(135deg, #0284c7, #0f172a)',
            'linear-gradient(135deg, #b91c1c, #7f1d1d)',
            'linear-gradient(135deg, #047857, #064e3b)'
        ];

        data.forEach((komunitas, index) => {
            const bg = gradients[index % gradients.length];
            
            // Null-safe description
            let desc = komunitas.deskripsi || '';
            if (desc.length > 80) desc = desc.substring(0, 80) + '...';

            const bgStyle = komunitas.logo 
                ? `background-image: url('${API_BASE}/uploads/${komunitas.logo}'); background-size: cover; background-position: center;`
                : `background: ${bg};`;

            // Null-safe alamat
            const alamat = komunitas.alamat || komunitas.kota || '-';
            const alamatShort = alamat.length > 25 ? alamat.substring(0, 25) + '...' : alamat;

            const card = `
            <div class="card">
                <div class="card-img" style="${bgStyle}"></div>
                <div class="card-content">
                    <div class="card-meta">
                        <span class="badge badge-dark">${komunitas.kota || '-'}</span>
                        <i class="fa-solid fa-user-group text-muted"></i>
                    </div>
                    <div class="location">
                        <i class="fa-solid fa-location-dot"></i> ${alamatShort}
                    </div>
                    <h3>${komunitas.nama_komunitas}</h3>
                    <p>${desc}</p>
                    <a href="gabung-komunitas.html?id=${komunitas.id}" class="btn btn-secondary w-100">Gabung Komunitas</a>
                </div>
            </div>`;
            container.innerHTML += card;
        });
    } catch (err) {
        console.error("Gagal mengambil data komunitas:", err);
        container.innerHTML = `<div style="text-align:center; grid-column: 1 / -1; padding: 2.5rem;">
            <i class="fa-solid fa-circle-exclamation" style="font-size:2rem; color:#f87171; margin-bottom:1rem; display:block;"></i>
            <p style="color:#f87171; margin-bottom:0.5rem;">Gagal memuat data komunitas.</p>
            <small style="color:#94a3b8;">Pastikan server berjalan di <strong>http://localhost:3000</strong> dan MySQL (XAMPP) aktif.</small>
        </div>`;
    }
}

// Load data on start
document.addEventListener('DOMContentLoaded', loadKomunitas);
