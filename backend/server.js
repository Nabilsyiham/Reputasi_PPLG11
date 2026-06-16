const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format file tidak didukung. Hanya gunakan .png, .jpg, .jpeg, .webp'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
});

const app = express();
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files from the 'syabab' directory
app.use(express.static(path.join(__dirname, '../syabab')));

// Serve uploads directory
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_syabab',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Setup Database Tables matching actual local schema + support tables
async function initDB() {
    try {
        console.log("Connecting to Database...");

        // Create Database if not exists
        const tempConn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });
        const dbName = process.env.DB_NAME || 'db_syabab';
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await tempConn.end();

        const conn = await pool.getConnection();

        // 1. Users
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_lengkap VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                nomor_telepon VARCHAR(20),
                password VARCHAR(255) NOT NULL,
                role ENUM('admin','user') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 2. Komunitas
        await conn.query(`
            CREATE TABLE IF NOT EXISTS komunitas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_admin VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                no_telepon_admin VARCHAR(20),
                password VARCHAR(255) NOT NULL,
                nama_komunitas VARCHAR(100) NOT NULL,
                no_telepon_komunitas VARCHAR(20),
                tipe_komunitas VARCHAR(50),
                tanggal_pendirian DATE,
                deskripsi TEXT,
                website VARCHAR(255),
                fokus_utama VARCHAR(100),
                fokus_tambahan VARCHAR(100),
                logo VARCHAR(255) DEFAULT NULL,
                alamat TEXT,
                provinsi VARCHAR(100),
                kota_kabupaten VARCHAR(100),
                kode_pos VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 3. Profile (for Anggota / User details)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS profile (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                username VARCHAR(50) UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                profile_photo VARCHAR(255) DEFAULT NULL,
                country VARCHAR(100) DEFAULT 'Indonesia',
                bio TEXT,
                role VARCHAR(50) DEFAULT 'user',
                total_online_hours INT DEFAULT 0,
                total_activities INT DEFAULT 0,
                total_social_initiatives INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 4. Kegiatan
        await conn.query(`
            CREATE TABLE IF NOT EXISTS kegiatan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                komunitas_id INT NOT NULL,
                judul_kegiatan VARCHAR(150) NOT NULL,
                tujuan_utama TEXT,
                deskripsi TEXT,
                tanggal DATE,
                lokasi TEXT,
                link_donasi VARCHAR(255) DEFAULT NULL,
                gambar_kegiatan VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (komunitas_id) REFERENCES komunitas(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 5. Donations
        await conn.query(`
            CREATE TABLE IF NOT EXISTS donations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT NULL,
                donor_name VARCHAR(100),
                amount DECIMAL(12,2),
                message TEXT,
                payment_method VARCHAR(50),
                status ENUM('pending','paid','failed') DEFAULT 'paid',
                donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 6. Partisipasi (Activities joined by Anggota)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS partisipasi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                kegiatan_id INT NOT NULL,
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_kegiatan (user_id, kegiatan_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 7. Komunitas Members (Communities joined by Anggota)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS komunitas_members (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                komunitas_id INT NOT NULL,
                status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
                no_whatsapp VARCHAR(20),
                alamat_domisili TEXT,
                keahlian VARCHAR(255),
                motivasi TEXT,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (komunitas_id) REFERENCES komunitas(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_komunitas (user_id, komunitas_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Update kegiatan table to include gambar_cover if it does not exist
        await conn.query("ALTER TABLE kegiatan ADD COLUMN gambar_cover VARCHAR(255) DEFAULT NULL AFTER link_donasi").catch(() => {});
        
        // Update komunitas_members table to include new fields if they do not exist
        await conn.query("ALTER TABLE komunitas_members ADD COLUMN status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending'").catch(() => {});
        await conn.query("ALTER TABLE komunitas_members ADD COLUMN no_whatsapp VARCHAR(20)").catch(() => {});
        await conn.query("ALTER TABLE komunitas_members ADD COLUMN alamat_domisili TEXT").catch(() => {});
        await conn.query("ALTER TABLE komunitas_members ADD COLUMN keahlian VARCHAR(255)").catch(() => {});
        await conn.query("ALTER TABLE komunitas_members ADD COLUMN motivasi TEXT").catch(() => {});

        conn.release();
        console.log("✅ Database & semua tabel siap.");
    } catch (error) {
        console.error("CRITICAL DB Error:", error.message || error);
    }
}
initDB();

// Middleware JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Akses ditolak. Token tidak ditemukan." });

    jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
        if (err) return res.status(403).json({ error: "Token tidak valid." });
        req.user = user;
        next();
    });
}

// ============================================================
// KOMUNITAS ROUTES
// ============================================================

// GET all communities
app.get('/api/komunitas', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM komunitas ORDER BY created_at DESC");
        res.json(rows);
    } catch (error) {
        console.error("Fetch Komunitas Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// GET single community by ID
app.get('/api/komunitas/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT k.*, 
                (SELECT COUNT(*) FROM komunitas_members WHERE komunitas_id = k.id AND status = 'accepted') as total_anggota,
                (SELECT COUNT(*) FROM kegiatan WHERE komunitas_id = k.id) as total_kegiatan
            FROM komunitas k
            WHERE k.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: "Komunitas tidak ditemukan" });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error("Fetch Komunitas by ID Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// POST register new community
app.post('/api/komunitas', upload.single('s2_logo'), async (req, res) => {
    const data = req.body;
    const logoFile = req.file ? req.file.filename : null;
    try {
        const hashedPassword = await bcrypt.hash(data.s1_password, 10);
        
        // Insert directly into komunitas table
        const [result] = await pool.query(
            `INSERT INTO komunitas
            (nama_admin, email, no_telepon_admin, password, nama_komunitas, no_telepon_komunitas, tipe_komunitas, tanggal_pendirian, deskripsi, website, fokus_utama, fokus_tambahan, logo, alamat, provinsi, kota_kabupaten, kode_pos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.s1_nama_lengkap, data.s1_email, data.s1_telp, hashedPassword,
                data.s2_nama, data.s2_telp, data.s2_tipe, data.s2_tanggal,
                data.s2_deskripsi, data.s2_website, data.s2_fokus_utama, data.s2_fokus_tambahan, logoFile,
                data.s3_alamat, data.s3_provinsi, data.s3_kota, data.s3_kodepos
            ]
        );

        // Generate auto login token
        const token = jwt.sign(
            { id: result.insertId, role: 'admin_komunitas', email: data.s1_email },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            message: "Komunitas berhasil didaftarkan!",
            token: token,
            user: {
                id: result.insertId,
                name: data.s1_nama_lengkap,
                email: data.s1_email,
                role: 'admin_komunitas'
            }
        });
    } catch (error) {
        console.error("Insert Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Email sudah terdaftar. Gunakan email lain." });
        }
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// ============================================================
// USER / MEMBERS REGISTRATION & LOGIN
// ============================================================

// POST register new member (anggota)
app.post('/api/register', async (req, res) => {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ error: "Semua field harus diisi" });
    }

    let conn;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Insert into users table
        const [userResult] = await conn.query(
            "INSERT INTO users (nama_lengkap, email, nomor_telepon, password, role) VALUES (?, ?, ?, ?, 'user')",
            [name, email, phone, hashedPassword]
        );
        const userId = userResult.insertId;

        // 2. Insert into profile table
        await conn.query(
            `INSERT INTO profile (full_name, email, password, role, total_online_hours, total_activities, total_social_initiatives) 
             VALUES (?, ?, ?, 'user', 0, 0, 0)`,
            [name, email, hashedPassword]
        );

        await conn.commit();

        // Auto login after registration
        const token = jwt.sign(
            { id: userId, role: 'anggota', email: email },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            message: "Pendaftaran berhasil!",
            token: token,
            user: {
                id: userId,
                name: name,
                email: email,
                role: 'anggota'
            }
        });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("Register Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Email sudah terdaftar" });
        }
        res.status(500).json({ error: "Terjadi kesalahan server" });
    } finally {
        if (conn) conn.release();
    }
});

// POST login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        // 1. Check komunitas table first (for Community Admins)
        const [komunitasRows] = await pool.query("SELECT * FROM komunitas WHERE email = ?", [email]);
        if (komunitasRows.length > 0) {
            const adminUser = komunitasRows[0];
            const isMatch = await bcrypt.compare(password, adminUser.password);
            if (isMatch) {
                const token = jwt.sign(
                    { id: adminUser.id, role: 'admin_komunitas', email: adminUser.email },
                    process.env.JWT_SECRET || 'secretkey',
                    { expiresIn: '24h' }
                );
                return res.json({
                    success: true,
                    message: "Login berhasil!",
                    token: token,
                    user: {
                        id: adminUser.id,
                        name: adminUser.nama_admin,
                        email: adminUser.email,
                        role: 'admin_komunitas',
                        avatar: adminUser.logo
                    }
                });
            }
        }

        // 2. If not found in komunitas, check users table (for Anggota/Members)
        const [userRows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (userRows.length > 0) {
            const user = userRows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                // Fetch profile avatar
                const [profRows] = await pool.query("SELECT profile_photo FROM profile WHERE email = ?", [email]);
                const avatar = profRows.length > 0 ? profRows[0].profile_photo : null;

                const token = jwt.sign(
                    { id: user.id, role: 'anggota', email: user.email },
                    process.env.JWT_SECRET || 'secretkey',
                    { expiresIn: '24h' }
                );
                return res.json({
                    success: true,
                    message: "Login berhasil!",
                    token: token,
                    user: {
                        id: user.id,
                        name: user.nama_lengkap,
                        email: user.email,
                        role: 'anggota',
                        avatar: avatar
                    }
                });
            }
        }

        return res.status(401).json({ error: "Email atau password salah" });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// GET current user details
app.get('/api/user', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'admin_komunitas') {
            const [rows] = await pool.query('SELECT id, nama_admin as name, email, no_telepon_admin as phone, logo as avatar, created_at FROM komunitas WHERE id = ?', [req.user.id]);
            if (rows.length === 0) return res.status(404).json({ error: "User tidak ditemukan" });
            const user = rows[0];
            user.role = 'admin_komunitas';
            return res.json(user);
        } else {
            const [rows] = await pool.query(`
                SELECT u.id, u.nama_lengkap as name, u.email, u.nomor_telepon as phone, 
                       p.profile_photo as avatar, p.total_online_hours, p.total_activities, 
                       p.total_social_initiatives, u.created_at 
                FROM users u 
                LEFT JOIN profile p ON u.email = p.email 
                WHERE u.id = ?
            `, [req.user.id]);
            if (rows.length === 0) return res.status(404).json({ error: "User tidak ditemukan" });
            const user = rows[0];
            user.role = 'anggota';
            return res.json(user);
        }
    } catch (error) {
        console.error("Fetch User Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// PUT update profile
app.put('/api/update-profile', authenticateToken, upload.single('avatar'), async (req, res) => {
    const user_id = req.user.id;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'nama wajib diisi' });
    }

    try {
        if (req.user.role === 'admin_komunitas') {
            let query, params;
            if (req.file) {
                query = 'UPDATE komunitas SET nama_admin = ?, logo = ? WHERE id = ?';
                params = [name, req.file.filename, user_id];
            } else {
                query = 'UPDATE komunitas SET nama_admin = ? WHERE id = ?';
                params = [name, user_id];
            }
            await pool.query(query, params);

            const [rows] = await pool.query('SELECT id, nama_admin as name, email, logo as avatar FROM komunitas WHERE id = ?', [user_id]);
            const updated = rows[0];
            updated.role = 'admin_komunitas';
            res.json({ success: true, message: 'Profil berhasil diperbarui!', user: updated });
        } else {
            let query, params;
            if (req.file) {
                query = 'UPDATE profile SET full_name = ?, profile_photo = ? WHERE email = ?';
                params = [name, req.file.filename, req.user.email];
            } else {
                query = 'UPDATE profile SET full_name = ? WHERE email = ?';
                params = [name, req.user.email];
            }
            await pool.query(query, params);

            // Update user table
            await pool.query('UPDATE users SET nama_lengkap = ? WHERE id = ?', [name, user_id]);

            const [rows] = await pool.query(`
                SELECT u.id, u.nama_lengkap as name, u.email, p.profile_photo as avatar 
                FROM users u 
                LEFT JOIN profile p ON u.email = p.email 
                WHERE u.id = ?
            `, [user_id]);
            const updated = rows[0];
            updated.role = 'anggota';
            res.json({ success: true, message: 'Profil berhasil diperbarui!', user: updated });
        }
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// PUT update online hours
app.put('/api/profile/online', authenticateToken, async (req, res) => {
    const { hours } = req.body;
    if (hours === undefined || isNaN(hours)) {
        return res.status(400).json({ error: "Invalid hours value" });
    }
    try {
        await pool.query("UPDATE profile SET total_online_hours = ? WHERE email = ?", [hours, req.user.email]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ============================================================
// KEGIATAN ROUTES
// ============================================================

// GET all activities
app.get('/api/kegiatan', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT kg.id, kg.komunitas_id, kg.judul_kegiatan as judul, kg.tujuan_utama, kg.deskripsi, 
                   kg.tanggal, kg.lokasi, kg.link_donasi, kg.gambar_kegiatan as gambar, kg.gambar_cover as gambar_card, 
                   k.nama_komunitas, k.logo as logo_komunitas, k.fokus_utama, k.fokus_tambahan, k.deskripsi as komunitas_deskripsi, k.no_telepon_komunitas AS telp_komunitas, k.email, k.website
            FROM kegiatan kg
            LEFT JOIN komunitas k ON kg.komunitas_id = k.id
            ORDER BY kg.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error("Fetch Kegiatan Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// GET single activity
app.get('/api/kegiatan/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT kg.id, kg.komunitas_id, kg.judul_kegiatan as judul, kg.tujuan_utama, kg.deskripsi, 
                    kg.tanggal, kg.lokasi, kg.link_donasi, kg.gambar_kegiatan as gambar, kg.gambar_cover as gambar_card, 
                    k.nama_komunitas, k.no_telepon_komunitas AS telp_komunitas, k.fokus_utama, k.fokus_tambahan, k.deskripsi as komunitas_deskripsi, k.email, k.website
             FROM kegiatan kg
             LEFT JOIN komunitas k ON kg.komunitas_id = k.id
             WHERE kg.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: "Kegiatan tidak ditemukan" });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error("Fetch Kegiatan by ID Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// GET activities created by a specific community admin
app.get('/api/kegiatan/user/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, komunitas_id, judul_kegiatan as judul, tujuan_utama, deskripsi, tanggal, lokasi, link_donasi, gambar_kegiatan as gambar, gambar_cover as gambar_card 
            FROM kegiatan 
            WHERE komunitas_id = ? 
            ORDER BY created_at DESC
        `, [req.params.userId]);
        res.json(rows);
    } catch (error) {
        console.error("Fetch User Kegiatan Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// POST create new activity
app.post('/api/kegiatan', authenticateToken, upload.fields([{ name: 'gambar', maxCount: 1 }, { name: 'gambar_card', maxCount: 1 }]), async (req, res) => {
    const komunitas_id = req.user.id;
    const { judul, deskripsi, tanggal, lokasi, tujuan_utama, link_donasi } = req.body;
    const gambar = req.files && req.files['gambar'] ? req.files['gambar'][0].filename : null;
    const gambar_card = req.files && req.files['gambar_card'] ? req.files['gambar_card'][0].filename : null;

    if (!judul || !deskripsi || !tanggal || !lokasi) {
        return res.status(400).json({ error: "Semua field wajib harus diisi" });
    }
    try {
        const [result] = await pool.query(
            "INSERT INTO kegiatan (komunitas_id, judul_kegiatan, deskripsi, tanggal, lokasi, tujuan_utama, link_donasi, gambar_kegiatan, gambar_cover) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [komunitas_id, judul, deskripsi, tanggal, lokasi, tujuan_utama || null, link_donasi || null, gambar, gambar_card]
        );
        res.json({ success: true, message: "Kegiatan berhasil dibuat!", id: result.insertId });
    } catch (error) {
        console.error("Create Kegiatan Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// PUT edit activity
app.put('/api/kegiatan/:id', authenticateToken, upload.fields([{ name: 'gambar', maxCount: 1 }, { name: 'gambar_card', maxCount: 1 }]), async (req, res) => {
    const komunitas_id = req.user.id;
    const { judul, deskripsi, tanggal, lokasi, tujuan_utama, link_donasi } = req.body;

    if (!judul || !deskripsi || !tanggal || !lokasi) {
        return res.status(400).json({ error: "Semua field wajib harus diisi" });
    }
    try {
        const newGambar = req.files && req.files['gambar'] ? req.files['gambar'][0].filename : null;
        const newGambarCard = req.files && req.files['gambar_card'] ? req.files['gambar_card'][0].filename : null;

        let setClauses = ['judul_kegiatan=?', 'deskripsi=?', 'tanggal=?', 'lokasi=?', 'tujuan_utama=?', 'link_donasi=?'];
        let params = [judul, deskripsi, tanggal, lokasi, tujuan_utama || null, link_donasi || null];

        if (newGambar) {
            setClauses.push('gambar_kegiatan=?');
            params.push(newGambar);
        }
        if (newGambarCard) {
            setClauses.push('gambar_cover=?');
            params.push(newGambarCard);
        }

        params.push(req.params.id, komunitas_id);
        const query = `UPDATE kegiatan SET ${setClauses.join(', ')} WHERE id=? AND komunitas_id=?`;

        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Kegiatan tidak ditemukan atau Anda tidak berhak mengubahnya" });
        }
        res.json({ success: true, message: "Kegiatan berhasil diperbarui!" });
    } catch (error) {
        console.error("Update Kegiatan Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// DELETE activity
app.delete('/api/kegiatan/:id', authenticateToken, async (req, res) => {
    const komunitas_id = req.user.id;
    try {
        const [result] = await pool.query("DELETE FROM kegiatan WHERE id = ? AND komunitas_id = ?", [req.params.id, komunitas_id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Kegiatan tidak ditemukan atau Anda tidak berhak menghapus" });
        }
        res.json({ success: true, message: "Kegiatan berhasil dihapus!" });
    } catch (error) {
        console.error("Delete Kegiatan Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// ============================================================
// DONATIONS & JOIN ACTIONS
// ============================================================

// POST donation
app.post('/api/donasi', async (req, res) => {
    const { user_id, donor_name, amount, message, payment_method, status } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Insert into donations table
        await conn.query(
            "INSERT INTO donations (user_id, donor_name, amount, message, payment_method, status) VALUES (?, ?, ?, ?, ?, ?)",
            [user_id || null, donor_name || 'Hamba Allah', amount, message || null, payment_method || 'Transfer', status || 'paid']
        );

        // 2. If logged in (user_id exists), increment total_social_initiatives in profile table
        if (user_id) {
            const [userRows] = await pool.query("SELECT email FROM users WHERE id = ?", [user_id]);
            if (userRows.length > 0) {
                const userEmail = userRows[0].email;
                await conn.query(
                    "UPDATE profile SET total_social_initiatives = total_social_initiatives + 1 WHERE email = ?",
                    [userEmail]
                );
            }
        }

        await conn.commit();
        res.json({ success: true, message: "Donasi berhasil disalurkan. Terima kasih atas kedermawanan Anda!" });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("Donation Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    } finally {
        if (conn) conn.release();
    }
});

// POST join activity (partisipasi)
app.post('/api/kegiatan/join', authenticateToken, async (req, res) => {
    const user_id = req.user.id;
    const { kegiatan_id } = req.body;

    if (!kegiatan_id) {
        return res.status(400).json({ error: "kegiatan_id wajib diisi" });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Insert into partisipasi table
        await conn.query(
            "INSERT INTO partisipasi (user_id, kegiatan_id) VALUES (?, ?)",
            [user_id, kegiatan_id]
        );

        // 2. Increment total_activities in profile table
        await conn.query(
            "UPDATE profile SET total_activities = total_activities + 1 WHERE email = ?",
            [req.user.email]
        );

        await conn.commit();
        res.json({ success: true, message: "Berhasil bergabung ke kegiatan sosial ini!" });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error("Join Kegiatan Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Anda sudah bergabung ke kegiatan ini sebelumnya." });
        }
        res.status(500).json({ error: "Terjadi kesalahan server" });
    } finally {
        if (conn) conn.release();
    }
});

// POST join community (komunitas_members)
app.post('/api/komunitas/join', authenticateToken, async (req, res) => {
    const user_id = req.user.id;
    const { komunitas_id, no_whatsapp, alamat_domisili, keahlian, motivasi } = req.body;

    if (!komunitas_id) {
        return res.status(400).json({ error: "komunitas_id wajib diisi" });
    }

    try {
        await pool.query(
            "INSERT INTO komunitas_members (user_id, komunitas_id, no_whatsapp, alamat_domisili, keahlian, motivasi, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
            [user_id, komunitas_id, no_whatsapp || null, alamat_domisili || null, keahlian || null, motivasi || null]
        );
        res.json({ success: true, message: "Berhasil mendaftar ke komunitas ini! Menunggu validasi admin." });
    } catch (error) {
        console.error("Join Komunitas Error:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Anda sudah mendaftar ke komunitas ini." });
        }
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// GET pending requests for a community (For Admin)
app.get('/api/komunitas/:id/requests', authenticateToken, async (req, res) => {
    try {
        // Ensure the requester is the admin of this community
        if (req.user.role !== 'admin_komunitas' || req.user.id != req.params.id) {
            return res.status(403).json({ error: "Akses ditolak" });
        }
        
        const [rows] = await pool.query(`
            SELECT km.id as request_id, km.user_id, km.status, km.no_whatsapp, km.alamat_domisili, km.keahlian, km.motivasi, km.joined_at,
                   u.nama_lengkap, p.profile_photo as avatar
            FROM komunitas_members km
            JOIN users u ON km.user_id = u.id
            LEFT JOIN profile p ON u.email = p.email
            WHERE km.komunitas_id = ? AND km.status = 'pending'
            ORDER BY km.joined_at DESC
        `, [req.params.id]);
        res.json(rows);
    } catch (error) {
        console.error("Fetch Requests Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// PUT accept/reject request (For Admin)
app.put('/api/komunitas/request/:req_id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin_komunitas') {
            return res.status(403).json({ error: "Akses ditolak" });
        }
        
        const reqId = req.params.req_id;
        const { action } = req.body; // 'accept' or 'reject'
        const status = action === 'accept' ? 'accepted' : 'rejected';
        
        // Verify the request belongs to this admin's community
        const [reqRows] = await pool.query("SELECT komunitas_id FROM komunitas_members WHERE id = ?", [reqId]);
        if (reqRows.length === 0 || reqRows[0].komunitas_id != req.user.id) {
            return res.status(404).json({ error: "Permintaan tidak valid" });
        }

        await pool.query("UPDATE komunitas_members SET status = ? WHERE id = ?", [status, reqId]);
        res.json({ success: true, message: `Permintaan berhasil di${action === 'accept' ? 'terima' : 'tolak'}.` });
    } catch (error) {
        console.error("Update Request Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// GET status of community registrations for a user (For Anggota)
app.get('/api/user/komunitas/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'anggota') {
            return res.status(403).json({ error: "Akses ditolak" });
        }
        
        const [rows] = await pool.query(`
            SELECT km.status, km.joined_at, k.nama_komunitas, k.logo
            FROM komunitas_members km
            JOIN komunitas k ON km.komunitas_id = k.id
            WHERE km.user_id = ?
            ORDER BY km.joined_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (error) {
        console.error("Fetch User Status Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});


// GET joined activities for a user
app.get('/api/kegiatan/joined/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT kg.id, kg.judul_kegiatan as judul, kg.tanggal, kg.lokasi, kg.deskripsi, 
                   k.nama_komunitas
            FROM partisipasi p
            JOIN kegiatan kg ON p.kegiatan_id = kg.id
            LEFT JOIN komunitas k ON kg.komunitas_id = k.id
            WHERE p.user_id = ?
            ORDER BY p.registered_at DESC
        `, [req.params.userId]);
        res.json(rows);
    } catch (error) {
        console.error("Fetch Joined Kegiatan Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// GET joined communities for a user (only accepted)
app.get('/api/komunitas/joined/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT k.id, k.nama_komunitas, k.logo, k.tipe_komunitas, k.kota_kabupaten as kota
            FROM komunitas_members km
            JOIN komunitas k ON km.komunitas_id = k.id
            WHERE km.user_id = ? AND km.status = 'accepted'
            ORDER BY km.joined_at DESC
        `, [req.params.userId]);
        res.json(rows);
    } catch (error) {
        console.error("Fetch Joined Komunitas Error:", error);
        res.status(500).json({ error: "Terjadi kesalahan server" });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Buka browser Anda ke: http://localhost:${PORT}`);
});