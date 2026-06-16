// API BASE Configuration
const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        document.getElementById('detail-title').textContent = "Kegiatan tidak ditemukan";
        document.getElementById('detail-desc').textContent = "ID kegiatan tidak diberikan di URL. Silakan kembali ke halaman sebelumnya.";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/kegiatan/${id}`, { 
            headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') } 
        });
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Kegiatan tidak ditemukan di database.');
            }
            throw new Error('Gagal memuat detail kegiatan dari server.');
        }

        const kegiatan = await response.json();

        // Format tanggal (contoh: 2026-05-20 ke 20 Mei 2026)
        const dateObj = new Date(kegiatan.tanggal);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString('id-ID', options);

        // ── HERO ──────────────────────────────────────────────────
        document.getElementById('detail-title').textContent = kegiatan.judul;
        document.getElementById('detail-date').innerHTML = `<i class="fa-regular fa-calendar"></i> ${formattedDate}`;
        document.getElementById('detail-loc-hero').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${kegiatan.lokasi || '-'}`;

        // ── MAIN LEFT ─────────────────────────────────────────────

        // Deskripsi
        document.getElementById('detail-desc').textContent = kegiatan.deskripsi || '-';

        // Gambar artikel (gambar kegiatan utama)
        if (kegiatan.gambar) {
            const imgEl = document.getElementById('detail-gambar');
            if (imgEl) {
                imgEl.src = `${API_BASE}/uploads/${kegiatan.gambar}`;
                imgEl.style.display = 'block';
            }
        }

        // Fokus Utama & Tambahan (dari komunitas penyelenggara)
        const fokusUtamaEl = document.getElementById('detail-fokus-utama');
        const fokusTambahanEl = document.getElementById('detail-fokus-tambahan');
        const komunitasDescEl = document.getElementById('detail-komunitas-desc');

        if (fokusUtamaEl) fokusUtamaEl.textContent = kegiatan.fokus_utama || 'Umum';
        if (fokusTambahanEl) fokusTambahanEl.textContent = kegiatan.fokus_tambahan || '-';
        if (komunitasDescEl) komunitasDescEl.textContent = kegiatan.komunitas_deskripsi || '';

        // Tujuan utama kegiatan (jika ada, tampilkan di bawah fokus)
        if (kegiatan.tujuan_utama) {
            const tujuanItems = kegiatan.tujuan_utama.split('\n').filter(t => t.trim() !== '');
            if (tujuanItems.length > 0 && komunitasDescEl) {
                const tujuanHtml = `<strong style="display:block; margin-top:1rem; margin-bottom:0.5rem; color:var(--text-dark);">Tujuan Kegiatan:</strong>
                <ul style="padding-left:1.25rem; color:#475569;">
                    ${tujuanItems.map(t => `<li>${t.trim()}</li>`).join('')}
                </ul>`;
                komunitasDescEl.insertAdjacentHTML('afterend', tujuanHtml);
            }
        }

        // Alamat Lengkap
        const locEl = document.getElementById('detail-loc');
        if (locEl) locEl.textContent = kegiatan.lokasi || 'Tidak ada info lokasi';

        // ── SIDEBAR RIGHT ─────────────────────────────────────────

        // Donasi card (tampilkan jika ada link_donasi)
        if (kegiatan.link_donasi) {
            const supportCard = document.getElementById('detail-support-card');
            if (supportCard) supportCard.style.display = 'block';
        }

        // Informasi Kontak & Penyelenggara
        const orgNameEl = document.getElementById('org-name');
        const contactEmailEl = document.getElementById('contact-email');
        const contactWebsiteEl = document.getElementById('contact-website');

        if (orgNameEl) orgNameEl.textContent = `Penyelenggara: ${kegiatan.nama_komunitas || 'Komunitas'}`;

        if (contactEmailEl) {
            if (kegiatan.email) {
                contactEmailEl.innerHTML = `<a href="mailto:${kegiatan.email}" style="color: inherit; text-decoration: underline;">${kegiatan.email}</a>`;
            } else {
                contactEmailEl.textContent = '-';
            }
        }

        if (contactWebsiteEl) {
            if (kegiatan.website) {
                contactWebsiteEl.href = kegiatan.website;
                contactWebsiteEl.textContent = kegiatan.website;
            } else {
                contactWebsiteEl.textContent = '-';
                contactWebsiteEl.removeAttribute('href');
            }
        }

        // Tombol WhatsApp
        const btnChatWa = document.getElementById('btn-chat-wa');
        if (btnChatWa) {
            if (kegiatan.telp_komunitas) {
                // Bersihkan nomor dari karakter non-digit, ubah awalan 0 ke 62
                let nomorWa = String(kegiatan.telp_komunitas).replace(/\D/g, '');
                if (nomorWa.startsWith('0')) nomorWa = '62' + nomorWa.substring(1);
                btnChatWa.addEventListener('click', () => {
                    window.open(`https://wa.me/${nomorWa}`, '_blank');
                });
            } else {
                btnChatWa.style.opacity = '0.5';
                btnChatWa.style.cursor = 'not-allowed';
                btnChatWa.title = 'Nomor WhatsApp tidak tersedia';
            }
        }

        // Tombol Gabung / Daftar
        const btnGabung = document.getElementById('btn-gabung-kegiatan');
        if (btnGabung) {
            btnGabung.addEventListener('click', () => {
                const user = localStorage.getItem('user');
                if (!user) {
                    alert('Harap login terlebih dahulu untuk mendaftar kegiatan ini.');
                    return;
                }
                alert('Fitur pendaftaran kegiatan akan segera hadir!');
            });
        }

    } catch (error) {
        console.error("Error fetching kegiatan:", error);
        document.getElementById('detail-title').textContent = "Terjadi Kesalahan";
        document.getElementById('detail-desc').textContent = error.message || "Gagal memuat detail kegiatan. Pastikan server berjalan dan database terhubung.";
    }

    // ============================================================
    // DONATION POPUP MODAL LOGIC
    // ============================================================
    const donationModal = document.getElementById('donationModal');
    const donasiBtn = document.getElementById('detail-donasi-btn');
    const closeDonationModal = document.getElementById('closeDonationModal');
    const cancelDonationBtn = document.getElementById('cancelDonationBtn');
    const donationForm = document.getElementById('donationForm');
    
    const presetBtns = document.querySelectorAll('.preset-btn');
    const customAmountGroup = document.getElementById('custom-amount-group');
    const donasiAmountInput = document.getElementById('donasi_amount');
    
    let selectedAmount = 0;

    if (donasiBtn) {
        donasiBtn.addEventListener('click', () => {
            donationModal.style.display = 'flex';
            // Pre-fill name if logged in
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                document.getElementById('donasi_name').value = user.name || '';
            }
        });
    }

    function closeDonation() {
        donationModal.style.display = 'none';
        donationForm.reset();
        customAmountGroup.style.display = 'none';
        selectedAmount = 0;
        presetBtns.forEach(b => {
            b.style.background = '';
            b.style.color = '';
            b.style.borderColor = '';
        });
    }

    if (closeDonationModal) closeDonationModal.addEventListener('click', closeDonation);
    if (cancelDonationBtn) cancelDonationBtn.addEventListener('click', closeDonation);
    
    // Preset Nominal click handlers
    presetBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Reset active style from other buttons
            presetBtns.forEach(b => {
                b.style.background = '';
                b.style.color = '';
                b.style.borderColor = '';
            });

            // Set active style
            this.style.background = '#e6f4ea';
            this.style.color = '#137333';
            this.style.borderColor = '#137333';

            const val = this.getAttribute('data-val');
            if (val) {
                selectedAmount = parseInt(val);
                customAmountGroup.style.display = 'none';
                donasiAmountInput.removeAttribute('required');
            } else {
                // Nominal Lain clicked
                selectedAmount = 0;
                customAmountGroup.style.display = 'block';
                donasiAmountInput.setAttribute('required', 'true');
                donasiAmountInput.focus();
            }
        });
    });

    if (donationForm) {
        donationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            let finalAmount = selectedAmount;
            if (finalAmount === 0) {
                finalAmount = parseInt(donasiAmountInput.value);
            }

            if (!finalAmount || finalAmount < 1000) {
                alert("Nominal donasi minimal Rp 1.000");
                return;
            }

            const paymentMethod = document.getElementById('donasi_payment').value;
            const donorName = document.getElementById('donasi_name').value.trim() || 'Hamba Allah';
            const message = document.getElementById('donasi_message').value.trim();

            const submitBtn = document.getElementById('submitDonationBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

            // Get logged in user id
            let userId = null;
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    userId = u.id;
                } catch(err){}
            }

            try {
                const response = await fetch(`${API_BASE}/api/donasi`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        donor_name: donorName,
                        amount: finalAmount,
                        message: message,
                        payment_method: paymentMethod,
                        status: 'paid'
                    })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(result.message);
                    
                    // Increment initiatives count locally if logged in as member
                    if (userStr) {
                        try {
                            const userObj = JSON.parse(userStr);
                            if (userObj.role === 'anggota') {
                                userObj.total_social_initiatives = (userObj.total_social_initiatives || 0) + 1;
                                localStorage.setItem('user', JSON.stringify(userObj));
                            }
                        } catch(err){}
                    }

                    closeDonation();
                } else {
                    alert(result.error || "Gagal menyalurkan donasi");
                }
            } catch (err) {
                console.error(err);
                alert("Gagal terhubung ke server untuk mengirim donasi");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Lanjutkan Donasi";
            }
        });
    }
});
