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
        console.log('Connected to the gwms.db SQLite database.');
        
        db.serialize(() => {
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
                ('staff1', '1234', 'Somchai', 'staff')`;
            db.run(insertUsers);

            // --- สร้างตาราง products สำหรับหน้า Inventory ---
            db.run(`CREATE TABLE IF NOT EXISTS Products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                details TEXT,
                brand TEXT,
                category TEXT,
                sku TEXT UNIQUE,
                zone TEXT,
                quantity INTEGER,
                icon TEXT
            )`);

            // ใส่ข้อมูลสินค้าจำลองตั้งต้น
            const insertProducts = `INSERT OR IGNORE INTO Products (name, details, brand, category, sku, zone, quantity, icon) VALUES 
                ('Stratocaster Pro II', 'Dark Night', 'Fender', 'Electric', 'FND-STR-001', 'Zone A / Rack 12', 12, 'electric_car'),
                ('Les Paul Standard', 'Heritage Cherry Sunburst', 'Gibson', 'Electric', 'GIB-LP-050', 'Zone A / Rack 08', 2, 'electric_car'),
                ('D-28 Acoustic', 'Natural', 'Martin', 'Acoustic', 'MAR-D28-002', 'Zone B / Shelf 02', 5, 'music_note'),
                ('RG550 Genesis', 'Desert Sun Yellow', 'Ibanez', 'Electric', 'IBZ-RG-112', 'Zone A / Rack 22', 0, 'electric_bolt'),
                ('Pro Cable 10ft', 'Braided Black', 'Ernie Ball', 'Accessory', 'ACC-CBL-010', 'Zone D / Bin 05', 145, 'cable')`;
            db.run(insertProducts);

            //สร้างตาราง Order
            db.run(`CREATE TABLE IF NOT EXISTS Orders (
                order_id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER,
                user_id INTEGER,
                status TEXT,
                detail TEXT,
                timestamp DATE,

                FOREIGN KEY (item_id) REFERENCES Products(id),
                FOREIGN KEY (user_id) REFERENCES Users(id)
                )`)
        });
    }
});

// ==========================================
// 3. ระบบ Authentication (Login / Logout)
// ==========================================
app.get('/', (req, res) => {
    res.render('login' , { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.render('login', { error: 'ระบบฐานข้อมูลขัดข้อง' });
        }
        
        if (row) {
            req.session.user = {
                name: row.name,
                role: row.role
            };
            res.redirect('/home');
        } else {
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
    
    res.render('home', {
        user: req.session.user,
        currentPage: 'home'
    });
});

app.get('/inventory', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    
    // ดึงข้อมูลสินค้าทั้งหมดจากฐานข้อมูล
    db.all(`SELECT * FROM products`, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }
        
        // ส่งต่อให้ไฟล์ inventory.ejs ไปวนลูปแสดงผล
        res.render('inventory', {
            user: req.session.user,
            currentPage: 'inventory',
            products: rows
        });
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
    db.run(sql, [username, password, name, role], function(err) {
        if (err) console.error(err.message);
        res.redirect('/admintool');
    });
});

app.post('/admintool/delete/:id', requireAdmin, (req, res) => {
    const sql = `DELETE FROM users WHERE id = ?`;
    db.run(sql, req.params.id, function(err) {
        if (err) console.error(err.message);
        res.redirect('/admintool');
    });
});

app.post('/admintool/edit/:id', requireAdmin, (req, res) => {
    const { name, role } = req.body;
    const sql = `UPDATE users SET name = ?, role = ? WHERE id = ?`;
    
    db.run(sql, [name, role, req.params.id], function(err) {
        if (err) console.error(err.message);
        res.redirect('/admintool');
    });
});

// 6. เข้าสู่หน้า Order Management
app.get('/orders', (req, res) => {
    res.render('order.ejs', {
            user: req.session.user,
            currentPage: 'orders'
        }
    );
});

// ==========================================
// 7. เริ่มการทำงานเซิร์ฟเวอร์
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`GWMS Server started at http://localhost:${PORT}`);
});