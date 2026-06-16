// API BASE Configuration
const API_BASE = window.location.port === '3000' ? '' : 'http://localhost:3000';

// ============================================================
// HELPER: Generate Initials from name
// ============================================================
function getInitials(name) {
    if (!name) return '-';
    const parts = name.trim().split(' ');
    let initials = parts[0][0].toUpperCase();
    if (parts.length > 1) {
        initials += parts[parts.length - 1][0].toUpperCase();
    }
    return initials;
}

// ============================================================
// HELPER: Render avatar (photo or initials)
// ============================================================
function renderAvatar(avatarEl, user) {
    if (user.avatar) {
        avatarEl.innerHTML = '';
        avatarEl.style.backgroundImage = `url('${API_BASE}/uploads/${user.avatar}')`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.style.color = 'transparent';
    } else {
        avatarEl.style.backgroundImage = '';
        avatarEl.style.color = '';
        avatarEl.innerText = getInitials(user.name);
    }
}

// ============================================================
// MAIN: Load profile data from localStorage & backend
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userStr || !token) {
        window.location.href = 'login.html';
        return;
    }

    let user;
    try {
        user = JSON.parse(userStr);
    } catch (e) {
        console.error("Invalid user data in localStorage");
        window.location.href = 'login.html';
        return;
    }

    // Initialize logout button
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }

    // --- Fetch latest user details from server ---
    try {
        const response = await fetch(`${API_BASE}/api/user`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            const fetchedUser = await response.json();
            user = { ...user, ...fetchedUser };
            localStorage.setItem('user', JSON.stringify(user));
        }
    } catch (err) {
        console.warn("Failed to sync profile with server. Using local cache.", err);
    }

    // --- Populate sidebar ---
    const nameEl       = document.getElementById('p_name');
    const emailEl      = document.getElementById('p_email');
    const avatarEl     = document.getElementById('p_avatar_initials');
    const roleEl       = document.getElementById('p_role');

    if (nameEl)  nameEl.innerText  = user.name  || '-';
    if (emailEl) emailEl.innerText = user.email || '-';
    if (avatarEl) renderAvatar(avatarEl, user);

    if (roleEl) {
        if (user.role === 'admin_komunitas') {
            roleEl.innerHTML = '<i class="fa-solid fa-crown"></i> Ketua Komunitas';
            roleEl.style.backgroundColor = '#fef3c7';
            roleEl.style.color = '#d97706';
            document.getElementById('komunitas-view').style.display = 'block';
            loadKomunitasKegiatan();
            fetchPendingRegistrations();
        } else {
            roleEl.innerHTML = '<i class="fa-solid fa-user-check"></i> Anggota Aktif';
            roleEl.style.backgroundColor = '#ecfdf5';
            roleEl.style.color = '#059669';
            document.getElementById('anggota-view').style.display = 'block';
            
            // Start member modules
            loadMemberStatsAndActivities();
            fetchUserRegistrationNotifications();
        }
    }

    // ============================================================
    // EDIT PROFILE MODAL
    // ============================================================
    const editModal       = document.getElementById('editProfileModal');
    const btnEditProfile  = document.getElementById('btnEditProfile');
    const closeEditModal  = document.getElementById('closeEditModal');
    const cancelEdit      = document.getElementById('cancelEditProfile');
    const editForm        = document.getElementById('editProfileForm');
    const editNameInput   = document.getElementById('edit_name');
    const editEmailDisp   = document.getElementById('edit_email_display');
    const saveBtn         = document.getElementById('saveProfileBtn');

    // Modal avatar elements
    const modalAvatarWrapper = document.getElementById('modalAvatarWrapper');
    const modalAvatarPreview = document.getElementById('modal_avatar_preview');
    const modalAvatarInput   = document.getElementById('modalAvatarInput');
    let newAvatarFile = null;

    if (btnEditProfile) {
        btnEditProfile.addEventListener('click', () => {
            if (editNameInput)  editNameInput.value  = user.name  || '';
            if (editEmailDisp)  editEmailDisp.value  = user.email || '';
            if (modalAvatarPreview) renderAvatar(modalAvatarPreview, user);
            newAvatarFile = null;
            editModal.style.display = 'flex';
        });
    }

    function closeModal() {
        editModal.style.display = 'none';
    }
    if (closeEditModal) closeEditModal.addEventListener('click', closeModal);
    if (cancelEdit)     cancelEdit.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === editModal) closeModal();
    });

    if (modalAvatarWrapper) {
        modalAvatarWrapper.addEventListener('click', () => {
            if (modalAvatarInput) modalAvatarInput.click();
        });
    }

    if (modalAvatarInput) {
        modalAvatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            newAvatarFile = file;

            const reader = new FileReader();
            reader.onload = (ev) => {
                if (modalAvatarPreview) {
                    modalAvatarPreview.innerHTML = '';
                    modalAvatarPreview.style.backgroundImage = `url('${ev.target.result}')`;
                    modalAvatarPreview.style.backgroundSize = 'cover';
                    modalAvatarPreview.style.backgroundPosition = 'center';
                    modalAvatarPreview.style.color = 'transparent';
                }
            };
            reader.readAsDataURL(file);
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newName = editNameInput ? editNameInput.value.trim() : '';
            if (!newName) {
                alert('Nama tidak boleh kosong!');
                return;
            }

            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
            }

            try {
                const formData = new FormData();
                formData.append('name', newName);
                if (newAvatarFile) {
                    formData.append('avatar', newAvatarFile);
                }

                const response = await fetch(`${API_BASE}/api/update-profile`, {
                    method: 'PUT',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    user = { ...user, ...result.user };
                    localStorage.setItem('user', JSON.stringify(user));

                    if (nameEl)  nameEl.innerText = user.name;
                    if (avatarEl) renderAvatar(avatarEl, user);

                    alert('✅ Profil berhasil diperbarui!');
                    closeModal();
                } else {
                    alert('❌ ' + (result.error || 'Gagal menyimpan profil'));
                }
            } catch (err) {
                console.error('Update Profile Error:', err);
                alert('❌ Gagal terhubung ke server');
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan';
                }
            }
        });
    }

    // ============================================================
    // MEMBER STATS & TIME ONLINE TRACKING
    // ============================================================
    function loadMemberStatsAndActivities() {
        // Set stats values
        document.getElementById('stat-activities-count').innerText = user.total_activities || 0;
        document.getElementById('stat-initiatives-count').innerText = user.total_social_initiatives || 0;

        // Real-time online time tracking
        let initialSeconds = (user.total_online_hours || 0) * 3600;
        let elapsedSeconds = 0;

        function formatOnlineTime(totalSeconds) {
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            return `${h}j ${m}m ${s}d`;
        }

        const onlineHoursVal = document.getElementById('stat-online-hours');
        if (onlineHoursVal) {
            onlineHoursVal.innerText = formatOnlineTime(initialSeconds);
            
            // Increment every second
            setInterval(() => {
                elapsedSeconds++;
                const curSeconds = initialSeconds + elapsedSeconds;
                onlineHoursVal.innerText = formatOnlineTime(curSeconds);
                
                // Sync with DB every 10 seconds
                if (elapsedSeconds % 10 === 0) {
                    syncOnlineTime(curSeconds / 3600);
                }
            }, 1000);
        }

        // Fetch Joined activities
        fetchJoinedActivities();

        // Fetch Joined communities
        fetchJoinedCommunities();
    }

    async function syncOnlineTime(hours) {
        try {
            await fetch(`${API_BASE}/api/profile/online`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token 
                },
                body: JSON.stringify({ hours: hours })
            });
            // Update localStorage cached user stats
            user.total_online_hours = hours;
            localStorage.setItem('user', JSON.stringify(user));
        } catch (e) {
            console.error("Failed to sync online time:", e);
        }
    }

    async function fetchJoinedActivities() {
        const listContainer = document.getElementById('member-activity-list');
        if (!listContainer) return;

        try {
            const response = await fetch(`${API_BASE}/api/kegiatan/joined/${user.id}`);
            const data = await response.json();

            if (!data.length) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        Anda belum mendaftar di kegiatan apapun.
                    </div>`;
                return;
            }

            listContainer.innerHTML = data.map(k => {
                const d = new Date(k.tanggal);
                const month = d.toLocaleString('id-ID', { month: 'short' });
                const dateNum = d.getDate();

                return `
                <div class="activity-card" style="display:flex; margin-bottom: 1rem; background: var(--white); border-radius: 8px; border: 1px solid #e2e8f0; padding: 1rem; cursor:pointer;" onclick="window.location.href='detail-kegiatan.html?id=${k.id}'">
                    <div class="activity-date bg-dark-blue text-white" style="padding: 0.6rem; text-align: center; min-width: 60px; border-radius: 8px; margin-right: 1rem;">
                        <span class="date-num" style="display: block; font-size: 1.2rem; font-weight: 700; line-height: 1;">${dateNum}</span>
                        <span class="date-month" style="font-size: 0.75rem; text-transform: uppercase; display: block; font-weight: 600;">${month}</span>
                    </div>
                    <div class="activity-content" style="flex: 1;">
                        <h4 class="activity-title" style="margin: 0 0 0.25rem 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">${k.judul}</h4>
                        <p style="font-size: 0.85rem; color: #64748b; margin: 0 0 0.25rem 0;">
                            Organized by: <strong style="color:#dfb23e">${k.nama_komunitas}</strong>
                        </p>
                        <p style="font-size: 0.85rem; color: #64748b; margin: 0;">
                            <i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i> ${k.lokasi}
                        </p>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            console.error(e);
            listContainer.innerHTML = `<div style="color:red; text-align:center;">Gagal memuat aktivitas terkini.</div>`;
        }
    }

    async function fetchJoinedCommunities() {
        const listContainer = document.getElementById('joined-komunitas-list');
        if (!listContainer) return;

        try {
            const response = await fetch(`${API_BASE}/api/komunitas/joined/${user.id}`);
            const data = await response.json();

            if (!data.length) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        Belum bergabung dengan komunitas manapun.
                    </div>`;
                return;
            }

            listContainer.innerHTML = data.map(k => {
                const logoStyle = k.logo 
                    ? `background-image:url('${API_BASE}/uploads/${k.logo}'); background-size:cover; background-position:center;`
                    : `background: #1f2937;`;
                
                return `
                <div class="activity-card" style="display:flex; align-items:center; margin-bottom: 1rem; background: var(--white); border-radius: 8px; border: 1px solid #e2e8f0; padding: 1rem; cursor:pointer;" onclick="window.location.href='detail-komunitas.html?id=${k.id}'">
                    <div style="width: 50px; height: 50px; border-radius: 8px; margin-right: 1rem; ${logoStyle}"></div>
                    <div style="flex: 1;">
                        <h4 style="margin:0 0 0.25rem 0; font-size:1.05rem; font-weight:700; color:#0f172a;">${k.nama_komunitas}</h4>
                        <p style="font-size:0.85rem; color:#64748b; margin:0;">
                            <span class="badge" style="padding: 2px 8px; font-size:0.75rem; background:#eff6ff; color:#1e40af; border-radius:4px; margin-right:8px;">${k.tipe_komunitas}</span>
                            <i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i> ${k.kota}
                        </p>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            console.error(e);
            listContainer.innerHTML = `<div style="color:red; text-align:center;">Gagal memuat daftar komunitas.</div>`;
        }
    }

    async function fetchUserRegistrationNotifications() {
        const listContainer = document.getElementById('member-notification-list');
        if (!listContainer) return;

        try {
            const response = await fetch(`${API_BASE}/api/user/komunitas/status`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await response.json();

            if (!data.length) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        Belum ada notifikasi pendaftaran komunitas.
                    </div>`;
                return;
            }

            listContainer.innerHTML = data.map(k => {
                const logoStyle = k.logo 
                    ? `background-image:url('${API_BASE}/uploads/${k.logo}'); background-size:cover; background-position:center;`
                    : `background: #1f2937;`;
                
                let statusBadge = '';
                if (k.status === 'pending') {
                    statusBadge = '<span class="badge" style="background:#fef3c7; color:#d97706; padding: 2px 8px; border-radius:4px; font-size:0.75rem;">Menunggu</span>';
                } else if (k.status === 'accepted') {
                    statusBadge = '<span class="badge" style="background:#ecfdf5; color:#059669; padding: 2px 8px; border-radius:4px; font-size:0.75rem;">Diterima</span>';
                } else if (k.status === 'rejected') {
                    statusBadge = '<span class="badge" style="background:#fee2e2; color:#ef4444; padding: 2px 8px; border-radius:4px; font-size:0.75rem;">Ditolak</span>';
                }
                
                return `
                <div class="activity-card" style="display:flex; align-items:center; margin-bottom: 1rem; background: var(--white); border-radius: 8px; border: 1px solid #e2e8f0; padding: 1rem;">
                    <div style="width: 50px; height: 50px; border-radius: 8px; margin-right: 1rem; ${logoStyle}"></div>
                    <div style="flex: 1;">
                        <h4 style="margin:0 0 0.25rem 0; font-size:1.05rem; font-weight:700; color:#0f172a;">${k.nama_komunitas}</h4>
                        <p style="font-size:0.85rem; color:#64748b; margin:0;">
                            Status Pendaftaran: ${statusBadge}
                        </p>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            console.error(e);
            listContainer.innerHTML = `<div style="color:red; text-align:center;">Gagal memuat notifikasi pendaftaran.</div>`;
        }
    }

    // ============================================================
    // KOMUNITAS: BUAT KEGIATAN & FETCH KEGIATAN (ADMIN)
    // ============================================================
    const btnBuatKegiatan = document.getElementById('btnBuatKegiatan');
    const buatKegiatanModal = document.getElementById('buatKegiatanModal');
    const closeKegiatanModal = document.getElementById('closeKegiatanModal');
    const cancelKegiatanModal = document.getElementById('cancelKegiatanModal');
    const buatKegiatanForm = document.getElementById('buatKegiatanForm');
    
    function setupImagePreview(inputId, previewContainerId, placeholderId, previewImgId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const previewContainer = document.getElementById(previewContainerId);
                const placeholder = document.getElementById(placeholderId);
                const previewImg = document.getElementById(previewImgId);
                
                if (file && previewContainer) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        previewImg.src = ev.target.result;
                        previewContainer.style.display = 'block';
                        placeholder.style.opacity = '0';
                    };
                    reader.readAsDataURL(file);
                } else if (previewContainer) {
                    previewContainer.style.display = 'none';
                    placeholder.style.opacity = '1';
                    previewImg.src = '';
                }
            });
        }
    }

    setupImagePreview('k_gambar', 'k_gambar_preview_container', 'k_gambar_placeholder', 'k_gambar_preview');
    setupImagePreview('k_gambar_card', 'k_gambar_card_preview_container', 'k_gambar_card_placeholder', 'k_gambar_card_preview');

    let editKegiatanId = null;

    function resetImagePreview(previewContainerId, placeholderId, previewImgId) {
        const previewContainer = document.getElementById(previewContainerId);
        const placeholder = document.getElementById(placeholderId);
        const previewImg = document.getElementById(previewImgId);
        if (previewContainer) {
            previewContainer.style.display = 'none';
            placeholder.style.opacity = '1';
            previewImg.src = '';
        }
    }

    function resetKegiatanModal() {
        if (buatKegiatanForm) buatKegiatanForm.reset();
        editKegiatanId = null;
        document.querySelector('#buatKegiatanModal h2').textContent = 'Buat Kegiatan';
        document.querySelector('#buatKegiatanModal p').textContent = 'Tambah kegiatan baru untuk komunitas Anda.';
        document.getElementById('saveKegiatanBtn').innerHTML = '<i class="fa-solid fa-check"></i> Buat Kegiatan';
        
        resetImagePreview('k_gambar_preview_container', 'k_gambar_placeholder', 'k_gambar_preview');
        resetImagePreview('k_gambar_card_preview_container', 'k_gambar_card_placeholder', 'k_gambar_card_preview');
    }

    function closeKegiatan() {
        if (buatKegiatanModal) buatKegiatanModal.style.display = 'none';
        resetKegiatanModal();
    }

    if (btnBuatKegiatan) {
        btnBuatKegiatan.addEventListener('click', () => {
            resetKegiatanModal();
            buatKegiatanModal.style.display = 'flex';
        });
    }

    if (closeKegiatanModal) closeKegiatanModal.addEventListener('click', closeKegiatan);
    if (cancelKegiatanModal) cancelKegiatanModal.addEventListener('click', closeKegiatan);
    window.addEventListener('click', (e) => {
        if (e.target === buatKegiatanModal) closeKegiatan();
    });

    if (buatKegiatanForm) {
        buatKegiatanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveKegiatanBtn = document.getElementById('saveKegiatanBtn');
            
            const formData = new FormData();
            formData.append('judul', document.getElementById('k_judul').value);
            formData.append('deskripsi', document.getElementById('k_deskripsi').value);
            formData.append('tanggal', document.getElementById('k_tanggal').value);
            formData.append('lokasi', document.getElementById('k_lokasi').value);
            formData.append('tujuan_utama', document.getElementById('k_tujuan_utama').value);
            formData.append('link_donasi', document.getElementById('k_link_donasi').value);

            const fileInput = document.getElementById('k_gambar');
            if (fileInput.files.length > 0) {
                formData.append('gambar', fileInput.files[0]);
            }

            const fileInputCard = document.getElementById('k_gambar_card');
            if (fileInputCard.files.length > 0) {
                formData.append('gambar_card', fileInputCard.files[0]);
            }

            if (saveKegiatanBtn) {
                saveKegiatanBtn.disabled = true;
                saveKegiatanBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
            }

            try {
                const url = editKegiatanId ? `${API_BASE}/api/kegiatan/${editKegiatanId}` : `${API_BASE}/api/kegiatan`;
                const method = editKegiatanId ? 'PUT' : 'POST';
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    alert('✅ ' + (editKegiatanId ? 'Kegiatan berhasil diperbarui!' : 'Kegiatan berhasil dibuat!'));
                    closeKegiatan();
                    loadKomunitasKegiatan();
                } else {
                    alert('❌ ' + (result.error || 'Gagal membuat kegiatan'));
                }
            } catch (err) {
                console.error(err);
                alert('❌ Terjadi kesalahan');
            } finally {
                if (saveKegiatanBtn) {
                    saveKegiatanBtn.disabled = false;
                    saveKegiatanBtn.innerHTML = '<i class="fa-solid fa-check"></i> Buat Kegiatan';
                }
            }
        });
    }

    async function loadKomunitasKegiatan() {
        const listContainer = document.getElementById('komunitas-kegiatan-list');
        if (!listContainer) return;

        try {
            const response = await fetch(`${API_BASE}/api/kegiatan/user/${user.id}`, { 
                headers: { 'Authorization': 'Bearer ' + token } 
            });
            const kegiatan = await response.json();

            if (kegiatan.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align:center; padding: 2rem; color: var(--text-muted); border: 1px dashed #cbd5e1; border-radius: 8px;">
                        <i class="fa-regular fa-folder-open" style="font-size: 2rem; margin-bottom: 1rem; color: #94a3b8;"></i>
                        <p>Belum ada kegiatan. Silakan buat kegiatan pertama Anda.</p>
                    </div>`;
                return;
            }

            listContainer.innerHTML = kegiatan.map(k => {
                const d = new Date(k.tanggal);
                const month = d.toLocaleString('id-ID', { month: 'short' });
                const dateNum = d.getDate();
                
                return `
                <div class="activity-card" style="display:flex; justify-content: space-between; align-items: stretch; margin-bottom: 1rem; background: var(--white); border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
                    <div style="display:flex; flex: 1; cursor: pointer; align-items: flex-start; padding: 1.5rem;" onclick="window.location.href='detail-kegiatan.html?id=${k.id}'">
                        <div class="activity-date bg-dark-blue text-white" style="margin-top: 0.35rem; padding: 1rem; text-align: center; min-width: 75px; border-radius: 12px; margin-right: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                            <span class="date-num" style="display: block; font-size: 1.6rem; font-weight: 700; line-height: 1;">${dateNum}</span>
                            <span class="date-month" style="font-size: 0.85rem; text-transform: uppercase; margin-top: 0.3rem; display: block; font-weight: 600; letter-spacing: 1px;">${month}</span>
                        </div>
                        <div class="activity-content" style="flex: 1;">
                            <h4 class="activity-title" style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1.35rem; font-weight: 800; color: #0f172a;">${k.judul}</h4>
                            <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 500;">
                                <i class="fa-solid fa-location-dot" style="margin-right: 5px;"></i> ${k.lokasi}
                            </p>
                            <p class="activity-desc" style="font-size: 0.95rem; color: #475569; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${k.deskripsi}</p>
                        </div>
                    </div>
                    <div style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: center; gap: 0.5rem; border-left: 1px solid #f1f5f9;">
                        <button onclick="editKegiatan(${k.id})" class="btn btn-outline" style="color: #3b82f6; border-color: #3b82f6; padding: 0.5rem 1rem; cursor:pointer;">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        <button onclick="deleteKegiatan(${k.id})" class="btn btn-outline" style="color: #ef4444; border-color: #ef4444; padding: 0.5rem 1rem; cursor:pointer;">
                            <i class="fa-solid fa-trash"></i> Hapus
                        </button>
                    </div>
                </div>
                `;
            }).join('');
        } catch (err) {
            listContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:red;">Gagal memuat kegiatan.</div>`;
        }
    }

    // Export function to global so onclick works
    window.editKegiatan = async function(id) {
        try {
            const response = await fetch(`${API_BASE}/api/kegiatan/${id}`);
            if (!response.ok) throw new Error('Failed to fetch');
            const k = await response.json();
            
            editKegiatanId = id;
            document.getElementById('k_judul').value = k.judul || '';
            document.getElementById('k_deskripsi').value = k.deskripsi || '';
            document.getElementById('k_tanggal').value = k.tanggal ? k.tanggal.split('T')[0] : '';
            document.getElementById('k_lokasi').value = k.lokasi || '';
            document.getElementById('k_tujuan_utama').value = k.tujuan_utama || '';
            document.getElementById('k_link_donasi').value = k.link_donasi || '';
            
            // Show existing gambar preview
            const previewContainer = document.getElementById('k_gambar_preview_container');
            const placeholder = document.getElementById('k_gambar_placeholder');
            const previewImg = document.getElementById('k_gambar_preview');
            if (k.gambar && previewContainer) {
                previewImg.src = API_BASE + '/uploads/' + k.gambar;
                previewContainer.style.display = 'block';
                placeholder.style.opacity = '0';
            } else if (previewContainer) {
                previewContainer.style.display = 'none';
                placeholder.style.opacity = '1';
                previewImg.src = '';
            }

            // Show existing gambar_card preview
            const cardPreviewContainer = document.getElementById('k_gambar_card_preview_container');
            const cardPlaceholder = document.getElementById('k_gambar_card_placeholder');
            const cardPreviewImg = document.getElementById('k_gambar_card_preview');
            if (k.gambar_card && cardPreviewContainer) {
                cardPreviewImg.src = API_BASE + '/uploads/' + k.gambar_card;
                cardPreviewContainer.style.display = 'block';
                cardPlaceholder.style.opacity = '0';
            } else if (cardPreviewContainer) {
                cardPreviewContainer.style.display = 'none';
                cardPlaceholder.style.opacity = '1';
                cardPreviewImg.src = '';
            }
            
            document.querySelector('#buatKegiatanModal h2').textContent = 'Edit Kegiatan';
            document.querySelector('#buatKegiatanModal p').textContent = 'Perbarui detail kegiatan Anda.';
            document.getElementById('saveKegiatanBtn').innerHTML = '<i class="fa-solid fa-save"></i> Simpan Perubahan';
            
            document.getElementById('buatKegiatanModal').style.display = 'flex';
        } catch (err) {
            console.error(err);
            alert('❌ Gagal memuat data kegiatan');
        }
    };

    window.deleteKegiatan = async function(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) return;
        
        try {
            const response = await fetch(`${API_BASE}/api/kegiatan/${id}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            });
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Kegiatan dihapus');
                loadKomunitasKegiatan();
            } else {
                alert('❌ ' + (result.error || 'Gagal menghapus'));
            }
        } catch (err) {
            console.error(err);
            alert('❌ Terjadi kesalahan');
        }
    };

    // ============================================================
    // KOMUNITAS: PENDAFTAR BARU (ADMIN)
    // ============================================================
    const reviewModal = document.getElementById("reviewAnggotaModal");
    const closeReviewModal = document.getElementById("closeReviewModal");
    let currentReviewId = null;

    if (closeReviewModal) {
        closeReviewModal.onclick = () => reviewModal.style.display = "none";
    }

    window.addEventListener('click', (e) => {
        if (e.target === reviewModal) reviewModal.style.display = "none";
    });

    async function fetchPendingRegistrations() {
        const listContainer = document.getElementById('admin-notification-list');
        if (!listContainer) return;

        try {
            const response = await fetch(`${API_BASE}/api/komunitas/${user.id}/requests`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await response.json();

            if (!data.length) {
                listContainer.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-muted); border: 1px dashed #cbd5e1; border-radius: 8px;">
                        <i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 1rem; color: #94a3b8;"></i>
                        <p>Belum ada pendaftar baru.</p>
                    </div>`;
                return;
            }

            listContainer.innerHTML = data.map(req => {
                const avatarStyle = req.avatar 
                    ? `background-image:url('${API_BASE}/uploads/${req.avatar}'); background-size:cover; background-position:center; color:transparent;`
                    : `background: #1f2937;`;
                
                // Store data in a global object so it can be opened easily
                window[`reqData_${req.request_id}`] = req;

                return `
                <div class="activity-card" style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; background: var(--white); border-radius: 8px; border: 1px solid #e2e8f0; padding: 1rem;">
                    <div style="display:flex; align-items:center;">
                        <div class="profile-avatar bg-dark-blue text-white" style="width: 45px; height: 45px; font-size: 1.2rem; margin-right: 1rem; ${avatarStyle}">
                            ${!req.avatar ? getInitials(req.nama_lengkap) : ''}
                        </div>
                        <div>
                            <h4 style="margin:0 0 0.25rem 0; font-size:1.05rem; font-weight:700; color:#0f172a;">${req.nama_lengkap}</h4>
                            <p style="font-size:0.85rem; color:#64748b; margin:0;"><i class="fa-brands fa-whatsapp"></i> ${req.no_whatsapp || '-'}</p>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="openReviewModal(${req.request_id})" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Tinjau</button>
                </div>`;
            }).join('');
        } catch (e) {
            console.error(e);
            listContainer.innerHTML = `<div style="color:red; text-align:center;">Gagal memuat notifikasi pendaftar.</div>`;
        }
    }

    window.openReviewModal = function(id) {
        const req = window[`reqData_${id}`];
        if (!req) return;
        currentReviewId = id;
        
        document.getElementById('rev_nama').textContent = req.nama_lengkap;
        document.getElementById('rev_whatsapp').textContent = req.no_whatsapp || '-';
        document.getElementById('rev_alamat').textContent = req.alamat_domisili || '-';
        document.getElementById('rev_keahlian').textContent = req.keahlian || '-';
        document.getElementById('rev_motivasi').textContent = req.motivasi || '-';
        
        reviewModal.style.display = "flex";
    };

    const btnTerima = document.getElementById("btnTerimaAnggota");
    const btnTolak = document.getElementById("btnTolakAnggota");

    async function respondRequest(action) {
        if (!currentReviewId) return;
        try {
            const response = await fetch(`${API_BASE}/api/komunitas/request/${currentReviewId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ action })
            });
            
            const result = await response.json();
            if (response.ok) {
                alert(result.message);
                reviewModal.style.display = "none";
                fetchPendingRegistrations();
            } else {
                alert(result.error || "Gagal memproses permintaan");
            }
        } catch (e) {
            console.error(e);
            alert("Terjadi kesalahan sistem");
        }
    }

    if (btnTerima) btnTerima.onclick = () => respondRequest('accept');
    if (btnTolak) btnTolak.onclick = () => respondRequest('reject');

});
