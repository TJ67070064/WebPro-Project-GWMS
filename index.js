const express = require('express');
const session = require('express-session');
const { stat } = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// ==========================================
// 1. ตั้งค่าพื้นฐาน (Middleware & View Engine)
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

// ตั้งค่า Session
app.use(session({
    secret: 'gwms-secret-key',
    resave: false,
    saveUninitialized: false
}));

// ==========================================
// SECTION 2. DB & เชื่อมต่อและตั้งค่าฐานข้อมูล SQLite
// ==========================================
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the database.db SQLite database.');

        db.serialize(() => {
            db.run("PRAGMA foreign_keys = ON"); //Enable foreign keys

            // --- สร้างตาราง users ---
            db.run(`CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                name TEXT,
                role TEXT
            )`);

            // ใส่ข้อมูล User จำลอง
            const insertUsers = `INSERT OR IGNORE INTO Users (username, password, name, role) VALUES
                ('admin', '1234', 'TJ', 'admin'),
                ('manager', '1234', 'Somyod', 'manager'),
                ('staff1', '1234', 'Somchai', 'staff')`;
            db.run(insertUsers);

            //ตาราง LoginLog
            db.run(`CREATE TABLE IF NOT EXISTS LoginLog (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            display_name TEXT,
            status TEXT,
            ip_address TEXT,
            login_time TEXT DEFAULT (DATETIME('now', 'localtime'))
            )`);

            // --- สร้างตาราง Inventory (เปลี่ยน icon เป็น image) ---
            db.run(`CREATE TABLE IF NOT EXISTS Inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                details TEXT,
                brand TEXT,
                category TEXT,
                sku TEXT UNIQUE,
                zone TEXT,
                quantity INTEGER,
                image TEXT
            )`);

            // ใส่ข้อมูลสินค้าจำลอง (พร้อมรูปตัวอย่าง)
            const insertInventory = `INSERT OR IGNORE INTO Inventory (name, details, brand, category, sku, zone, quantity, image) VALUES 
                ('Stratocaster Pro II', 'Dark Night', 'Fender', 'Electric', 'FND-STR-001', 'Zone A / Rack 12', 12, 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=200&auto=format&fit=crop'),
                ('Les Paul Standard', 'Heritage Cherry Sunburst', 'Gibson', 'Electric', 'GIB-LP-050', 'Zone A / Rack 08', 2, 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=200&auto=format&fit=crop'),
                ('D-28 Acoustic', 'Natural', 'Martin', 'Acoustic', 'MAR-D28-002', 'Zone B / Shelf 02', 5, 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=200&auto=format&fit=crop'),
                ('RG550 Genesis', 'Desert Sun Yellow', 'Ibanez', 'Electric', 'IBZ-RG-112', 'Zone A / Rack 22', 0, 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=200&auto=format&fit=crop'),
                ('Pro Cable 10ft', 'Braided Black', 'Ernie Ball', 'Accessory', 'ACC-CBL-010', 'Zone D / Bin 05', 145, 'https://images.unsplash.com/photo-1621255799738-f860fb41f103?q=80&w=200&auto=format&fit=crop'),
                ('Stratocaster Pro II', 'Dark Night', 'Fender', 'Electric', 'FND-STR-001', 'Zone A / Rack 12', 12, 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=200&auto=format&fit=crop'),
                ('Les Paul Standard', 'Heritage Cherry Sunburst', 'Gibson', 'Electric', 'GIB-LP-050', 'Zone A / Rack 08', 2, 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=200&auto=format&fit=crop'),
                ('D-28 Acoustic', 'Natural', 'Martin', 'Acoustic', 'MAR-D28-002', 'Zone B / Shelf 02', 5, 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=200&auto=format&fit=crop'),
                ('RG550 Genesis', 'Desert Sun Yellow', 'Ibanez', 'Electric', 'IBZ-RG-112', 'Zone A / Rack 22', 0, 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=200&auto=format&fit=crop'),
                ('Pro Cable 10ft', 'Braided Black', 'Ernie Ball', 'Accessory', 'ACC-CBL-010', 'Zone D / Bin 05', 145, 'https://images.unsplash.com/photo-1621255799738-f860fb41f103?q=80&w=200&auto=format&fit=crop'),

                ('Telecaster Player', 'Butterscotch Blonde', 'Fender', 'Electric', 'FND-TEL-021', 'Zone A / Rack 03', 7, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=200&auto=format&fit=crop'),
                ('SG Standard', 'Cherry Red', 'Gibson', 'Electric', 'GIB-SG-011', 'Zone A / Rack 09', 3, 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=200&auto=format&fit=crop'),
                ('Jazzmaster Classic', 'Olympic White', 'Fender', 'Electric', 'FND-JZM-030', 'Zone A / Rack 14', 4, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=200&auto=format&fit=crop'),
                ('Jaguar Player', 'Surf Green', 'Fender', 'Electric', 'FND-JAG-008', 'Zone A / Rack 15', 6, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=200&auto=format&fit=crop'),
                ('Boss DS-1', 'Orange', 'Boss', 'Pedal', 'PED-BOS-001', 'Zone C / Bin 01', 22, 'https://images.unsplash.com/photo-1605020420620-20c943cc4669?q=80&w=200&auto=format&fit=crop'),
                ('Tube Screamer', 'Green', 'Ibanez', 'Pedal', 'PED-IBZ-002', 'Zone C / Bin 02', 18, 'https://images.unsplash.com/photo-1605020420620-20c943cc4669?q=80&w=200&auto=format&fit=crop'),
                ('Big Muff Pi', 'Black', 'Electro-Harmonix', 'Pedal', 'PED-EHX-003', 'Zone C / Bin 03', 11, 'https://images.unsplash.com/photo-1605020420620-20c943cc4669?q=80&w=200&auto=format&fit=crop'),
                ('DD-7 Digital Delay', 'Blue', 'Boss', 'Pedal', 'PED-BOS-004', 'Zone C / Bin 04', 9, 'https://images.unsplash.com/photo-1605020420620-20c943cc4669?q=80&w=200&auto=format&fit=crop'),
                ('Holy Grail Reverb', 'Silver', 'EHX', 'Pedal', 'PED-EHX-005', 'Zone C / Bin 05', 7, 'https://images.unsplash.com/photo-1605020420620-20c943cc4669?q=80&w=200&auto=format&fit=crop'),

                ('Guitar Picks Pack', 'Multi Color', 'Dunlop', 'Accessory', 'ACC-PCK-001', 'Zone D / Bin 02', 300, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=200&auto=format&fit=crop'),
                ('Capo Standard', 'Black', 'Kyser', 'Accessory', 'ACC-CAP-002', 'Zone D / Bin 03', 54, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=200&auto=format&fit=crop'),
                ('Strap Leather', 'Brown', 'Fender', 'Accessory', 'ACC-STP-003', 'Zone D / Bin 04', 33, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=200&auto=format&fit=crop'),
                ('Clip Tuner', 'Black', 'Snark', 'Accessory', 'ACC-TUN-004', 'Zone D / Bin 06', 61, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=200&auto=format&fit=crop'),
                ('Guitar Stand', 'Metal Black', 'Hercules', 'Accessory', 'ACC-STD-005', 'Zone D / Bin 07', 28, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=200&auto=format&fit=crop'),

                ('Katana 50', 'Black', 'Boss', 'Amplifier', 'AMP-BOS-050', 'Zone E / Shelf 01', 10, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?q=80&w=200&auto=format&fit=crop'),
                ('Blues Junior', 'Tweed', 'Fender', 'Amplifier', 'AMP-FND-020', 'Zone E / Shelf 02', 5, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?q=80&w=200&auto=format&fit=crop'),
                ('AC15', 'Black', 'Vox', 'Amplifier', 'AMP-VOX-015', 'Zone E / Shelf 03', 4, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?q=80&w=200&auto=format&fit=crop'),
                ('DSL40', 'Black', 'Marshall', 'Amplifier', 'AMP-MAR-040', 'Zone E / Shelf 04', 3, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?q=80&w=200&auto=format&fit=crop'),
                ('Spark 40', 'Black', 'Positive Grid', 'Amplifier', 'AMP-SPK-040', 'Zone E / Shelf 05', 6, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?q=80&w=200&auto=format&fit=crop'),

                ('Bass Precision', 'Sunburst', 'Fender', 'Bass', 'BAS-FND-001', 'Zone F / Rack 01', 3, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=200&auto=format&fit=crop'),
                ('Jazz Bass', 'Black', 'Fender', 'Bass', 'BAS-FND-002', 'Zone F / Rack 02', 2, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=200&auto=format&fit=crop'),
                ('SR300', 'Weathered Black', 'Ibanez', 'Bass', 'BAS-IBZ-003', 'Zone F / Rack 03', 4, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=200&auto=format&fit=crop'),
                ('TRBX304', 'Red', 'Yamaha', 'Bass', 'BAS-YAM-004', 'Zone F / Rack 04', 5, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=200&auto=format&fit=crop'),
                ('StingRay Ray4', 'Black', 'Sterling', 'Bass', 'BAS-STR-005', 'Zone F / Rack 05', 2, 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=200&auto=format&fit=crop');`;
            db.run(insertInventory);

            // --- สร้างตาราง Order ---
            db.run(`CREATE TABLE IF NOT EXISTS Orders (
                order_id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER,
                user_id INTEGER,
                order_quantity INTEGER,
                status TEXT,
                detail TEXT,
                timestamp TEXT DEFAULT (DATETIME('now', 'localtime')),
                FOREIGN KEY (item_id) REFERENCES Inventory(id),
                FOREIGN KEY (user_id) REFERENCES Users(id)
                );`);

            // --- สร้างตาราง ActivityLog ---
            db.run(`CREATE TABLE IF NOT EXISTS ActivityLog (
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                timestamp TEXT DEFAULT (DATETIME('now','localtime')),
                activity_type TEXT,
                product_name TEXT
            )`);
        });
    }
});
//!SECTION

// ==========================================
// Activity Log Function
// ==========================================

function logActivity(username, activity, product_name) {

    const sql = `
    INSERT INTO ActivityLog (username, activity_type, product_name)
    VALUES (?, ?, ?)
    `;

    db.run(sql, [username, activity, product_name], (err) => {
        if (err) {
            console.error("Log error:", err.message);
        }
    });
}

// ==========================================
// SECTION 3. ระบบ Authentication (Login / Logout)
// ==========================================
app.get('/', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    let ip_address = req.ip || req.socket.remoteAddress || 'Unknown IP';

    if (ip_address === '::1' || ip_address === '::ffff:127.0.0.1') {
    ip_address = '127.0.0.1 (Localhost)';
    }

    const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.render('login', { error: 'ระบบฐานข้อมูลขัดข้อง' });
        }

        if (row) {
            // ล็อกอินสำเร็จ -> บันทึก Log สถานะ Success
            db.run(`INSERT INTO LoginLog (username, display_name, status, ip_address) VALUES (?, ?, ?, ?)`, 
                   [username, row.name, 'Success', ip_address]);

            req.session.user = {
                id: row.id,
                name: row.name,
                role: row.role,
                username: row.username
            };
            
            // แยกเส้นทางเข้าหน้าเว็บตาม Role
            if (row.role === 'staff') {
                res.redirect('/inventory'); // Staff ไปหน้าคลังสินค้าเลย
            } else {
                res.redirect('/home'); // Admin กับ Manager ไปหน้า Dashboard
            }
        } else {
            // ล็อกอินไม่สำเร็จ -> บันทึก Log สถานะ Failed (ชื่อผู้ใช้เป็น Unknown)
            db.run(`INSERT INTO LoginLog (username, display_name, status, ip_address) VALUES (?, ?, ?, ?)`, 
                   [username, 'Unknown', 'Failed', ip_address]);

            res.render('login', { error: 'Username หรือ Password ไม่ถูกต้อง' });
        }
    });
});

app.get('/logout', (req, res) => {
    if (req.session.user) {
        let ip_address = req.ip || req.socket.remoteAddress || 'Unknown IP';
        if (ip_address === '::1' || ip_address === '::ffff:127.0.0.1') {
            ip_address = '127.0.0.1 (Localhost)';
        }

        const username = req.session.user.username || 'Unknown';
        const displayName = req.session.user.name || 'Unknown';

        db.run(`INSERT INTO LoginLog (username, display_name, status, ip_address) VALUES (?, ?, ?, ?)`, 
            [username, displayName, 'Logout', ip_address], 
            (err) => {
                if (err) console.error("Error logging logout:", err.message);
    
                req.session.destroy();
                res.redirect('/');
            }
        );
    } else {
        req.session.destroy();
        res.redirect('/');
    }
});
//!SECTION

// ==========================================
// SECTION 4. หน้าหลัก (Home & Inventory)
// ==========================================

app.get('/home', (req, res) => {
    if (!req.session.user) return res.redirect('/');

    // ป้องกันไม่ให้ staff แอบเข้ามาหน้า Dashboard
    if (req.session.user.role === 'staff') {
        return res.redirect('/inventory');
    }

    // ดึงสถิติต่างๆ จากฐานข้อมูลเพื่อส่งให้หน้า Dashboard
    const sqlStats = `
        SELECT 
            (SELECT SUM(quantity) FROM Inventory) AS totalStock,
            (SELECT COUNT(*) FROM Inventory WHERE quantity <= 5 AND quantity > 0) AS lowStock,
            (SELECT COUNT(*) FROM Orders WHERE status = 'Pending') AS pendingOrders,
            (SELECT COUNT(*) FROM Inventory WHERE quantity > 50) AS overStock
    `;

    db.get(sqlStats, [], (err, stats) => {
        if (err) {
            console.error("Error fetching stats:", err.message);
            return res.status(500).send("Database Error");
        }

        // ดึงประวัติการเข้าสู่ระบบ 5 รายการล่าสุด
        const sqlLogs = `SELECT * FROM LoginLog ORDER BY login_time DESC LIMIT 10`;

        db.all(sqlLogs, [], (err, logs) => {
            if (err) {
                console.error("Error fetching login logs:", err.message);
                return res.status(500).send("Database Error");
            }

            // ส่งตัวแปรทั้งหมดไปให้ home.ejs
            res.render('home', {
                user: req.session.user,
                currentPage: 'home',
                totalStock: stats.totalStock || 0,
                lowStock: stats.lowStock || 0,
                pendingOrders: stats.pendingOrders || 0,
                overStock: stats.overStock || 0,
                loginLogs: logs // ตัวแปรสำหรับแสดงในตาราง LoginLog
            });
        });
    });
});

app.get('/inventory', (req, res) => {
    if (!req.session.user) return res.redirect('/');

    // ดึงข้อมูลสินค้าทั้งหมดจากตาราง Inventory
    db.all(`SELECT * FROM Inventory ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }

        res.render('inventory', {
            user: req.session.user,
            currentPage: 'inventory',
            products: rows
        });
    });
});

//ADD
// Route สำหรับรับข้อมูลเพิ่มสินค้าใหม่ (รองรับรูปภาพ)
app.post('/inventory/add', (req, res) => {
    if (!req.session.user) return res.redirect('/');

    const { name, details, brand, category, sku, zone, quantity, image } = req.body;

    // ตั้งค่ารูปภาพ Default ในกรณีที่ไม่ได้ใส่ลิงก์มา
    const defaultImage = 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=200&auto=format&fit=crop';
    const finalImage = image ? image : defaultImage;

    const sql = `INSERT INTO Inventory (name, details, brand, category, sku, zone, quantity, image) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [name, details, brand, category, sku, zone, parseInt(quantity), finalImage], function (err) {
        if (err) {
            console.error('Error adding product:', err.message);
            return res.status(500).send("Error adding product. SKU might already exist.");
        }

        //keeplog
        logActivity(req.session.user.name, "ADD_PRODUCT", name);

        res.redirect('/inventory');
    });
});

// Route สำหรับรับข้อมูลแก้ไขสินค้า (Edit Product)
app.post('/inventory/edit/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/');

    const productId = req.params.id;
    const { name, details, brand, category, zone, quantity, image } = req.body;

    // ตั้งค่ารูปภาพ Default ในกรณีที่ลบลิงก์ออกจนว่างเปล่า
    const defaultImage = 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=200&auto=format&fit=crop';
    const finalImage = image ? image : defaultImage;

    // คำสั่ง SQL อัปเดตข้อมูล (ไม่ต้องอัปเดต SKU เพราะเป็นรหัสเฉพาะ)
    const sql = `UPDATE Inventory 
                 SET name = ?, details = ?, brand = ?, category = ?, zone = ?, quantity = ?, image = ? 
                 WHERE id = ?`;

    db.run(sql, [name, details, brand, category, zone, parseInt(quantity), finalImage, productId], function (err) {
        if (err) {
            console.error('Error updating product:', err.message);
            return res.status(500).send("Error updating product.");
        }

        //keeplog
        logActivity(req.session.user.name, "EDIT_PRODUCT", name);
        res.redirect('/inventory'); // อัปเดตเสร็จให้กลับไปหน้าคลังสินค้า
    });
});

//DELETE
// Route สำหรับลบสินค้า (Delete Product)
app.post('/inventory/delete/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    
    // const { name, details, brand, category, zone, quantity, image } = req.body;

    // ป้องกัน Staff ลบสินค้า
    if (req.session.user.role === 'staff') {
        return res.redirect('/inventory');
    }

    const productId = req.params.id;

    const selectId = `SELECT name FROM Inventory WHERE id = ?;`;
    db.get(selectId, [productId], (err, row) => {
        if (err) {
            console.error("Error fetching product:", err.message);
            return res.status(500).send("Database error");
        }

        const productName = row.name;
        const deleteProduct = `DELETE FROM Inventory WHERE id = ?`;
        db.run(deleteProduct, productId, (err) => {
            if (err) {
                console.error('Error deleting product:', err.message);
                return res.status(500).send("Error deleting product.");
            }

            //Keep Log by calling logActivity() function
            logActivity(req.session.user.name, "DELETE_PRODUCT", productName);
            res.redirect('/inventory');
            });
        });
});
//!SECTION

// ==========================================
// SECTION History(Activity log)
// ==========================================
app.get('/history', (req, res) => {

    if (!req.session.user) return res.redirect('/');

    const sql = `
    SELECT 
        log_id,
        activity_type,
        timestamp,
        username,
        product_name
    FROM ActivityLog
    ORDER BY timestamp DESC
    `;

    db.all(sql, [], (err, rows) => {

        if (err) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }

        res.render('history', {
            user: req.session.user,
            currentPage: 'history',
            logs: rows
        });

    });

});
//!SECTION

// ==========================================
// SECTION 5. ระบบจัดการแอดมิน (Admin Tools)
// ==========================================
const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/home');
    }
    next();
};

app.get('/admintool', requireAdmin, (req, res) => {
    const sql = `SELECT id, username, name, role FROM users`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }
        res.render('admintool', {
            dbUsers: rows,
            user: req.session.user,
            currentPage: 'admin'
        });
    });
});

app.post('/admintool/add', requireAdmin, (req, res) => {
    const { username, password, name, role } = req.body;
    const sql = `INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`;
    db.run(sql, [username, password, name, role], function (err) {
        if (err) console.error(err.message);
        res.redirect('/admintool');
    });
});

app.post('/admintool/delete/:id', requireAdmin, (req, res) => {
    const sql = `DELETE FROM users WHERE id = ?`;
    db.run(sql, req.params.id, function (err) {
        if (err) console.error(err.message);
        res.redirect('/admintool');
    });
});

app.post('/admintool/edit/:id', requireAdmin, (req, res) => {
    const { name, role } = req.body;
    const sql = `UPDATE users SET name = ?, role = ? WHERE id = ?`;
    db.run(sql, [name, role, req.params.id], function (err) {
        if (err) console.error(err.message);
        res.redirect('/admintool');
    });
});
//!SECTION
// ==========================================
// SECTION 6. เข้าสู่หน้า Order Management
// ==========================================
app.get('/orders', (req, res) => {
    if (!req.session.user) return res.redirect('/');

    const selectOrders = `SELECT
        Orders.order_id,
        Orders.timestamp,
        Orders.order_quantity,
        Orders.status,
        Orders.detail,
        Inventory.name AS product_name,
        Inventory.image AS image,
        Inventory.sku AS sku,
        Inventory.details AS details,
        Users.name AS user_name
        FROM Orders
        JOIN Inventory ON Orders.item_id = Inventory.id
        JOIN Users ON Orders.user_id = Users.id
        ORDER BY Orders.timestamp DESC`;

    const countStatus = `SELECT status, COUNT(order_id) AS total
                        FROM Orders
                        GROUP BY status
                        ORDER BY CASE status
                            WHEN 'รอการอนุมัติ' THEN 1
                            WHEN 'กำลังเตรียมสินค้า' THEN 2
                            WHEN 'รอการจัดส่ง' THEN 3
                            WHEN 'สินค้าออกจากโกดัง' THEN 4
                        END;`;
    db.all(selectOrders, [], (dataErr, dataRows) => {
        if (dataErr) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }

        db.all(countStatus, [], (cntErr, cntRows) => {
            if (cntErr) {
                console.error(err.message);
                return res.status(500).send("Database Error")
            }

            //หลังจาก query ให้มาตรวจสอบก่อน กันกรณีไม่มี status
            const statsObject = {
                'รอการอนุมัติ': 0,
                'กำลังเตรียมสินค้า': 0,
                'รอการจัดส่ง': 0,
                'สินค้าออกจากโกดัง': 0
            };
            cntRows.forEach(row => {
                statsObject[row.status] = row.total; //เพื่อบอกว่าถ้าเจอ row ไหนก็ใส่ค่าให้ row นั้น ถ้าไม่เจอจะกลายเป็น 0 (default) เอง
            })
            res.render('order', {
                user: req.session.user,
                currentPage: 'orders',
                orders: dataRows,
                stats: statsObject
            });
        });
    })
});

app.get('/orders/add-orders', (req, res) => {
    const allProduct = `SELECT id, name, quantity, image, sku FROM Inventory;`;
    db.all(allProduct, (err, rows) => {
        if (err) {
            return res.status(500).send("Database Error");
        }
        res.json(rows);
    });
});

app.post('/orders/add-orders/:id', (req, res) => {
    const insertOrder = `INSERT INTO Orders(item_id, user_id, status, detail, order_quantity)
                        VALUES(?, ?, ?, ?, ?);`;
    const inventoryId = req.params.id; //ยังไม่ใช้ ค่อยรอแก้ตอนใช้แบบ foregin key
    const user_id = req.session.user.id;
    const role = req.session.user.role;
    const { detail, inputQuantity } = req.body;

    let status;
    if (role == "staff") {
        status = "รอการอนุมัติ";
    } else {
        status = "กำลังเตรียมสินค้า";
    }
    db.run(insertOrder, [inventoryId, user_id, status, detail, inputQuantity], (err) => {
        if (err) {
            return res.status(500).send("Database Error" + err);
        }
        //INSERT เสร็จต้องไปลบรายการออกจาก Inventory ด้วย
        // const currentQuantity = inventory.quantity - quantity;
        const reduceInventory = `UPDATE Inventory
                                SET quantity = quantity - ?
                                WHERE id = ?;`;
        db.run(reduceInventory, [inputQuantity, inventoryId], (err) => {
            if (err) {
                return console.error(err);
            }
            res.redirect('/orders');
        });
    });
});
//!SECTION

// ==========================================
// SECTION API Routes
// ==========================================
app.get('/api/product/:id', (req, res) => {
    const productId = req.params.id;
    // แก้ไขจาก Products เป็น Inventory ให้ตรงกับชื่อตารางปัจจุบัน
    const sql = `SELECT * FROM Inventory WHERE id = ?`;

    db.get(sql, [productId], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: "Product not found" });
        }
        console.log("Send data from /api/product/:id back with ", row);
        res.json(row);
    });
});

// API: ดึงประวัติการเคลื่อนไหวของสินค้าแต่ละชิ้น
app.get('/api/inventory/history/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });

    const itemId = req.params.id;
    const sql = `
        SELECT
            Orders.order_id,
            Orders.order_quantity,
            Orders.status,
            Orders.detail,
            Orders.timestamp,
            Users.name AS user_name
        FROM Orders
        JOIN Users ON Orders.user_id = Users.id
        WHERE Orders.item_id = ?
        ORDER BY Orders.timestamp DESC
    `;

    db.all(sql, [itemId], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Database Error" });
        }
        res.json(rows);
    });
});
//!SECTION

// ==========================================
// 7. เริ่มการทำงานเซิร์ฟเวอร์
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`GWMS Server started at http://localhost:${PORT}`);
});