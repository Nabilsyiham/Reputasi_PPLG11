document.addEventListener('DOMContentLoaded', () => {
    const stepItems = document.querySelectorAll('.step-item');
    const sections = document.querySelectorAll('.form-section');
    const btnNext1 = document.getElementById('btn-next-1');
    const btnNext2 = document.getElementById('btn-next-2');
    const btnNext3 = document.getElementById('btn-next-3');
    const btnSubmit = document.getElementById('btn-submit');
    const chk1 = document.getElementById('chk1');
    const chk2 = document.getElementById('chk2');
    const inputs = document.querySelectorAll('.form-section input, .form-section textarea, .form-section select');
    const logoInput = document.getElementById('s2_logo');
    const uploadLogoButton = document.getElementById('btn-upload-logo');

    function goToStep(step) {
        sections.forEach(section => {
            section.style.display = section.id === `section-${step}` ? 'block' : 'none';
        });
        stepItems.forEach(item => {
            item.classList.toggle('active', item.dataset.step === String(step));
        });
        if (step === 4) {
            generatePreview();
        }
        validateCurrentStep();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.goToStep = goToStep;

    function validateCurrentStep() {
        const activeSection = document.querySelector('.form-section[style*="display: block"]');
        if (!activeSection) return;

        const stepId = activeSection.id.replace('section-', '');
        if (stepId === '1') {
            btnNext1.disabled = !isStep1Valid();
        }
        if (stepId === '2') {
            btnNext2.disabled = !isStep2Valid();
        }
        if (stepId === '3') {
            btnNext3.disabled = !isStep3Valid();
        }
        if (stepId === '4') {
            updateSubmitState();
        }
    }

    function isStep1Valid() {
        const name = document.getElementById('s1_nama_lengkap').value.trim();
        const email = document.getElementById('s1_email').value.trim();
        const phone = document.getElementById('s1_telp').value.trim();
        const password = document.getElementById('s1_password').value;
        const confirm = document.getElementById('s1_confirm').value;
        return name && email && phone && password.length >= 8 && password === confirm;
    }

    function isStep2Valid() {
        const name = document.getElementById('s2_nama').value.trim();
        const phone = document.getElementById('s2_telp').value.trim();
        const type = document.getElementById('s2_tipe').value;
        const date = document.getElementById('s2_tanggal').value;
        const desc = document.getElementById('s2_deskripsi').value.trim();
        return name && phone && type && date && desc.length >= 20;
    }

    function isStep3Valid() {
        const address = document.getElementById('s3_alamat').value.trim();
        const province = document.getElementById('s3_provinsi').value.trim();
        const city = document.getElementById('s3_kota').value.trim();
        return address && province && city;
    }

    function updateSubmitState() {
        btnSubmit.disabled = !(chk1.checked && chk2.checked);
    }

    function generatePreview() {
        document.getElementById('p_nama_lengkap').textContent = document.getElementById('s1_nama_lengkap').value.trim() || '-';
        document.getElementById('p_email').textContent = document.getElementById('s1_email').value.trim() || '-';
        document.getElementById('p_telp_admin').textContent = document.getElementById('s1_telp').value.trim() || '-';
        document.getElementById('p_nama_komunitas').textContent = document.getElementById('s2_nama').value.trim() || '-';
        document.getElementById('p_telp_komunitas').textContent = document.getElementById('s2_telp').value.trim() || '-';
        document.getElementById('p_tipe').textContent = document.getElementById('s2_tipe').value || '-';
        document.getElementById('p_tanggal').textContent = document.getElementById('s2_tanggal').value || '-';
        document.getElementById('p_deskripsi').textContent = document.getElementById('s2_deskripsi').value.trim() || '-';
        document.getElementById('p_website').textContent = document.getElementById('s2_website').value.trim() || '-';
        document.getElementById('p_fokus1').textContent = document.getElementById('s2_fokus_utama').value || '-';
        document.getElementById('p_fokus2').textContent = document.getElementById('s2_fokus_tambahan').value || '';
        document.getElementById('p_alamat').textContent = document.getElementById('s3_alamat').value.trim() || '-';
        document.getElementById('p_provinsi').textContent = document.getElementById('s3_provinsi').value.trim() || '-';
        document.getElementById('p_kota').textContent = document.getElementById('s3_kota').value.trim() || '-';
        document.getElementById('p_kodepos').textContent = document.getElementById('s3_kodepos').value.trim() || '-';
        updateSubmitState();
    }

    async function submitKomunitasForm(event) {
        event.preventDefault();
        if (!btnSubmit.disabled) {
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
            btnSubmit.disabled = true;

            const formData = new FormData();

            // Step 1
            formData.append('s1_nama_lengkap', document.getElementById('s1_nama_lengkap').value);
            formData.append('s1_email', document.getElementById('s1_email').value);
            formData.append('s1_telp', document.getElementById('s1_telp').value);
            formData.append('s1_password', document.getElementById('s1_password').value);

            // Step 2
            formData.append('s2_nama', document.getElementById('s2_nama').value);
            formData.append('s2_telp', document.getElementById('s2_telp').value);
            formData.append('s2_tipe', document.getElementById('s2_tipe').value);
            formData.append('s2_tanggal', document.getElementById('s2_tanggal').value);
            formData.append('s2_deskripsi', document.getElementById('s2_deskripsi').value);
            formData.append('s2_website', document.getElementById('s2_website').value);
            formData.append('s2_fokus_utama', document.getElementById('s2_fokus_utama').value);
            formData.append('s2_fokus_tambahan', document.getElementById('s2_fokus_tambahan').value);

            if (logoInput && logoInput.files[0]) {
                formData.append('s2_logo', logoInput.files[0]);
            }

            // Step 3
            formData.append('s3_alamat', document.getElementById('s3_alamat').value);
            formData.append('s3_provinsi', document.getElementById('s3_provinsi').value);
            formData.append('s3_kota', document.getElementById('s3_kota').value);
            formData.append('s3_kodepos', document.getElementById('s3_kodepos').value);

            try {
                const response = await fetch('http://localhost:3000/api/komunitas', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert('Pendaftaran komunitas berhasil!');
                    localStorage.setItem('user', JSON.stringify(result.user));
                    if (result.token) {
                        localStorage.setItem('token', result.token);
                    }
                    window.location.href = 'index.html';
                } else {
                    alert('Gagal: ' + (result.error || 'Terjadi kesalahan'));
                    btnSubmit.innerHTML = 'Daftar';
                    btnSubmit.disabled = false;
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Gagal menghubungi server. Pastikan backend sudah menyala (npm run dev di folder backend).');
                btnSubmit.innerHTML = 'Daftar';
                btnSubmit.disabled = false;
            }
        }
    }

    window.submitKomunitasForm = submitKomunitasForm;

    function togglePasswordIcons() {
        document.querySelectorAll('.toggle-password').forEach(toggle => {
            const targetId = toggle.dataset.target;
            const target = document.getElementById(targetId);
            if (!target) return;
            toggle.addEventListener('click', () => {
                const isVisible = target.type === 'text';
                target.type = isVisible ? 'password' : 'text';
                toggle.classList.toggle('fa-eye', !isVisible);
                toggle.classList.toggle('fa-eye-slash', isVisible);
            });
        });
    }

    function setupLogoUpload() {
        if (!logoInput || !uploadLogoButton) return;
        uploadLogoButton.addEventListener('click', () => logoInput.click());
        logoInput.addEventListener('change', () => {
            const file = logoInput.files[0];
            const preview = document.getElementById('logoPreview');
            if (!file || !preview) return;
            const reader = new FileReader();
            reader.onload = () => {
                preview.innerHTML = `<img src="${reader.result}" alt="Logo komunitas" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`;
            };
            reader.readAsDataURL(file);
        });
    }

    function attachFieldListeners() {
        inputs.forEach(input => {
            input.addEventListener('input', validateCurrentStep);
            input.addEventListener('change', validateCurrentStep);
        });
        if (chk1 && chk2) {
            chk1.addEventListener('change', updateSubmitState);
            chk2.addEventListener('change', updateSubmitState);
        }
    }

    attachFieldListeners();
    togglePasswordIcons();
    setupLogoUpload();
    validateCurrentStep();
});
