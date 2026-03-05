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
            db.run("PRAGMA foreign_keys = ON"); //Enable foreign keys
            // --- สร้างตาราง users ---
            db.run(`CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                name TEXT,
                role TEXT
            )`);

            // ใส่ข้อมูล User 
            const insertUsers = `INSERT OR IGNORE INTO Users (username, password, name, role) VALUES 
                ('admin', '1234', 'Somsri', 'admin'),
                ('staff1', '1234', 'Somchai', 'staff'),
                ('manager', '1234', 'Somyod', 'manager')`;
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
                order_quantity INTEGER,
                status TEXT,
                detail TEXT,
                timestamp TEXT DEFAULT (DATETIME('now', 'localtime')),

                FOREIGN KEY (item_id) REFERENCES Products(id),
                FOREIGN KEY (user_id) REFERENCES Users(id)
                )`);

            // const insertOrder = `INSERT INTO Orders (item_id, user_id, status, detail, order_quantity)
            //                     VALUES (?, ?, ?, ?, ?)`;

            // db.run(insertOrder, [1, 1, 'Pending', 'Walk-in order', 12]);
            // db.run(insertOrder, [2, 2, 'Picking', 'Online order #1001', 14]);
            // db.run(insertOrder, [3, 1, 'Completed', 'Acoustic sale', 15]);
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
        
        //session user ที่เก็บไว้
        if (row) {
            req.session.user = {
                id: row.id,
                name: row.name,
                role: row.role
            };
            
            // แยกเส้นทางตาม Role
            if (row.role === 'staff') {
                res.redirect('/inventory'); // Staff ไปหน้าจัดของเลย
            } else {
                res.redirect('/home'); // Admin กับ Manager ไปดูภาพรวม Dashboard
            }
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

const requireManagerOrAdmin = (req, res, next) => {
    if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'manager')) {
        return res.redirect('/inventory'); // ถ้าเป็นแค่ staff ให้เด้งไปหน้าคลังสินค้า
    }
    next();
};

app.get('/home', requireManagerOrAdmin, (req, res) => {
    if (!req.session.user) return res.redirect('/');
    
    res.render('home', {
        user: req.session.user,
        currentPage: 'home'
    });
});

app.get('/history', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    // เพิ่ม currentPage: 'home' เพื่อให้ Navbar รู้ว่าต้องไฮไลท์เมนูไหน
    res.render('history', { 
        user: req.session.user,
        currentPage: 'history' 
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

app.post('/inventory/add-order/:id', (req, res) => { //routing หลังจากเพิ่มใบเบิก
    // if (!req.session.user) return res.redirect('/');
    const item_id = req.params.id;
    const { quantity, detail } = req.body;
    const user_id = req.session.user.id;

    const insertOrder = `INSERT INTO Orders(item_id, user_id, status, detail, order_quantity)
                        VALUES(?, ?, ?, ?, ?);`;
    db.run(insertOrder, [item_id, user_id, "อยู่ระหว่างการเบิก", detail, quantity], (err) => {
        if (err) {
            return console.error(err);
        }
    });
    console.log("Insert order successfully!");
    res.redirect('/inventory');
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
    const selectOrders = `SELECT
                    Orders.order_id,
                    Orders.timestamp,
                    Orders.order_quantity,
                    Orders.status,
                    Products.name AS product_name,
                    Users.name AS user_name
                    FROM Orders
                    JOIN Products ON Orders.item_id = Products.id
                    JOIN Users ON Orders.user_id = Users.id
                    ORDER BY Orders.timestamp DESC
                    `;
    db.all(selectOrders, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }
        res.render('order.ejs', {
            user: req.session.user,
            currentPage: 'orders',
            orders: rows
        })
    })
});

//API ==============================
app.get('/api/product/:id', (req, res) => {
    const productId = req.params.id;
    const sql = `SELECT * FROM Products WHERE id = ?`;

    db.get(sql, [productId], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: "Product not found" });
        }
        // Send the data back as a JSON object (res.json() จะส่งข้อมูลกลับไปเป็น json)
        console.log("Send data from /api/product/:id back with ", row);
        res.json(row);
    });
});

// ==========================================
// 7. เริ่มการทำงานเซิร์ฟเวอร์
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`GWMS Server started at http://localhost:${PORT}`);
});