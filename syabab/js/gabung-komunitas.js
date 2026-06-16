// Get modal elements
const modal = document.getElementById("registerModal");
const btnDaftar = document.getElementById("btn-daftar-modal");
const spanClose = document.getElementsByClassName("close-modal")[0];

if (btnDaftar) {
    btnDaftar.onclick = function(e) {
        e.preventDefault();
        modal.style.display = "flex";
    }
}

if (spanClose) {
    spanClose.onclick = function() {
        modal.style.display = "none";
    }
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Fetch Data Komunitas
async function loadDetailKomunitas() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        document.getElementById('k_nama').innerText = "Komunitas Tidak Ditemukan";
        document.getElementById('k_deskripsi').innerText = "Mohon pilih komunitas dari halaman Beranda.";
        return;
    }

    try {
        const response = await fetch(`/api/komunitas/${id}`, { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') } });
        const data = await response.json();

        if (data.error) {
            document.getElementById('k_nama').innerText = data.error;
            return;
        }

        // Update UI
        document.getElementById('k_nama').innerText = "Bergabung Bersama " + data.nama_komunitas;
        
        // Set logo background if available
        if (data.logo) {
            const hero = document.querySelector('.detail-hero');
            hero.style.backgroundImage = `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.8)), url('/uploads/${data.logo}')`;
            hero.style.backgroundSize = 'cover';
            hero.style.backgroundPosition = 'center';
        }
        document.getElementById('k_lokasi').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${data.kota}, ${data.provinsi}`;
        document.getElementById('k_deskripsi').innerText = data.deskripsi;
        
        // Dynamic Community Details Section
        document.getElementById('k_tipe_title').innerText = data.tipe_komunitas;
        document.getElementById('k_tgl_berdiri').innerHTML = `<i class="fa-regular fa-calendar"></i> Berdiri: ${new Date(data.tanggal_pendirian).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}`;
        document.getElementById('k_website_display').innerHTML = `<i class="fa-solid fa-globe"></i> ${data.website || 'Tidak ada website'}`;
        document.getElementById('k_fokus_utama').innerText = data.fokus_utama;
        document.getElementById('k_fokus_tambahan').innerText = data.fokus_tambahan || '-';
        document.getElementById('k_domisili_full').innerText = `${data.kota}, ${data.provinsi}`;
        document.getElementById('k_alamat_full').innerText = data.alamat;

        // Admin Info
        document.getElementById('admin_name').innerText = data.admin_name;
        document.getElementById('admin_email').innerText = data.admin_email;
        if (document.getElementById('admin_initials')) {
            document.getElementById('admin_initials').innerText = data.admin_name.charAt(0).toUpperCase();
        }

        // Update WA link
        if (data.telp_komunitas) {
            const waNum = data.telp_komunitas.replace(/[^0-9]/g, '');
            const finalWa = waNum.startsWith('0') ? '62' + waNum.substring(1) : waNum;
            document.getElementById('k_wa').href = `https://wa.me/${finalWa}?text=Halo%20${data.nama_komunitas},%20saya%20tertarik%20untuk%20bergabung.`;
        }

    } catch (err) {
        console.error("Gagal mengambil data komunitas:", err);
    }
}

document.addEventListener('DOMContentLoaded', loadDetailKomunitas);
