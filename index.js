const express = require('express');
const session = require('express-session');
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
// 2. เชื่อมต่อและตั้งค่าฐานข้อมูล SQLite
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
                ('Pro Cable 10ft', 'Braided Black', 'Ernie Ball', 'Accessory', 'ACC-CBL-010', 'Zone D / Bin 05', 145, 'https://images.unsplash.com/photo-1621255799738-f860fb41f103?q=80&w=200&auto=format&fit=crop')`;
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
            )`);

            // --- สร้างตาราง ActivityLog ---
            db.run(`CREATE TABLE IF NOT EXISTS ActivityLog (
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                timestamp TEXT DEFAULT (DATETIME('now','localtime')),
                activity_type TEXT,
                product_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES Users(id),
                FOREIGN KEY (product_id) REFERENCES Inventory(id)
            )`);

            const insertOrder = `INSERT INTO Orders (item_id, user_id, status, detail, order_quantity)
                                 SELECT ?, ?, ?, ?, ?
                                 WHERE NOT EXISTS (SELECT 1 FROM Orders WHERE order_id = 1)`;
            db.run(insertOrder, [1, 1, 'Pending', 'Walk-in order', 12]);
            db.run(`INSERT INTO Orders (item_id, user_id, status, detail, order_quantity) SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM Orders WHERE order_id = 2)`, [2, 2, 'Picking', 'Online order #1001', 14]);
            db.run(`INSERT INTO Orders (item_id, user_id, status, detail, order_quantity) SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM Orders WHERE order_id = 3)`, [3, 1, 'Completed', 'Acoustic sale', 15]);
        });
    }
});
// ==========================================
// Activity Log Function
// ==========================================

function logActivity(userId, activity, productId) {

    const sql = `
    INSERT INTO ActivityLog (user_id, activity_type, product_id)
    VALUES (?, ?, ?)
    `;

    db.run(sql, [userId, activity, productId], (err) => {
        if (err) {
            console.error("Log error:", err.message);
        }
    });
}

// ==========================================
// 3. ระบบ Authentication (Login / Logout)
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
                role: row.role
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
    req.session.destroy();
    res.redirect('/');
});

// ==========================================
// 4. หน้าหลัก (Home & Inventory)
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
        const sqlLogs = `SELECT * FROM LoginLog ORDER BY login_time DESC LIMIT 5`;

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


app.get('/history', (req, res) => {
    if (!req.session.user) return res.redirect('/');

    res.render('history', {
        user: req.session.user,
        currentPage: 'history'
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
        logActivity(req.session.user.id, "ADD_PRODUCT", this.lastID);

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
        logActivity(req.session.user.id, "EDIT_PRODUCT", productId);
        res.redirect('/inventory'); // อัปเดตเสร็จให้กลับไปหน้าคลังสินค้า
    });
});

// Route สำหรับลบสินค้า (Delete Product)
app.post('/inventory/delete/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/');

    // ป้องกัน Staff ลบสินค้า
    if (req.session.user.role === 'staff') {
        return res.redirect('/inventory');
    }

    const productId = req.params.id;

    // คำสั่ง SQL ลบข้อมูลออกจากตาราง Inventory
    const sql = `DELETE FROM Inventory WHERE id = ?`;

    db.run(sql, productId, function (err) {
        if (err) {
            console.error('Error deleting product:', err.message);
            return res.status(500).send("Error deleting product.");
        }
        res.redirect('/inventory');
    });
});

// ==========================================
// 5. ระบบจัดการแอดมิน (Admin Tools)
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

// ==========================================
// 6. เข้าสู่หน้า Order Management
// ==========================================
app.get('/orders', (req, res) => {
    if (!req.session.user) return res.redirect('/');

    const selectOrders = `SELECT
        Orders.order_id,
        Orders.timestamp,
        Orders.order_quantity,
        Orders.status,
        Inventory.name AS product_name,
        Users.name AS user_name
        FROM Orders
        JOIN Inventory ON Orders.item_id = Inventory.id
        JOIN Users ON Orders.user_id = Users.id
        ORDER BY Orders.timestamp DESC`;

    db.all(selectOrders, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }
        res.render('order', {
            user: req.session.user,
            currentPage: 'orders',
            orders: rows
        })
    })
});

// ==========================================
// API Routes
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

// ==========================================
// 7. เริ่มการทำงานเซิร์ฟเวอร์
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`GWMS Server started at http://localhost:${PORT}`);
});