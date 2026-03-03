const { error } = require('console');
const express = require('express');
const session = require('express-session');
const path = require('path');
const PORT = 3000;

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

// 2. เชื่อมต่อฐานข้อมูล (จะสร้างไฟล์ user.db ให้อัตโนมัติในโฟลเดอร์โปรเจกต์)
const db = new sqlite3.Database('./user.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the user.db SQLite database.');
        
        // 3. สร้างตาราง users (ถ้ายังไม่มี) และใส่ข้อมูลตั้งต้น
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                name TEXT,
                role TEXT
            )`);

            // ใส่ข้อมูลจำลองลงไปใน Database (ใช้ INSERT OR IGNORE เพื่อป้องกันการใส่ข้อมูลซ้ำเวลาเปิดเซิร์ฟเวอร์ใหม่)
            const insertData = `INSERT OR IGNORE INTO users (username, password, name, role) VALUES 
                ('admin', '1234', 'TJ', 'admin'),
                ('staff1', '1234', 'Somchai', 'staff')`;
            db.run(insertData);
        });
    }
});

app.get('/', (req, res) => {
    res.render('login'); 
});

<<<<<<< HEAD
const db = require('./database');

// Route สำหรับตรวจสอบข้อมูล Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    const sql = `SELECT * FROM users WHERE username = ? AND password =?`;

    db.get(sql, [username,password], (error, row) => {
        if(error){
            console.error(error);
            return res.render('login',{error: 'ระบบเกิดข้อผิดพลาด'});
        }

        if (row) {
            //login ได้
            res.redirect('/home');
        } else{
            //login ไม่ได้
            res.render('login', { error: 'Username หรือ Password ไม่ถูกต้อง'});
        }
    });
});


// สร้าง Route สำหรับหน้า Dashboard (home)
app.get('/home', (req, res) => {
    // จำลองข้อมูลผู้ใช้ที่จะส่งไปแสดงผลบนหน้า EJS
    const userData = {
        name: 'Admin',
        role: 'Administrator'
    };
=======
// 4. แก้ไข Route Login ให้ดึงข้อมูลจาก Database แทน Array
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล SQLite
    const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
>>>>>>> origin/main
    
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.render('login', { error: 'ระบบฐานข้อมูลขัดข้อง' });
        }
        
        if (row) {
            // ถ้ารหัสถูกและเจอข้อมูล (row) ให้บันทึกลง Session
            req.session.user = {
                name: row.name,
                role: row.role
            };
            res.redirect('/home'); 
        } else {
            // ถ้าไม่เจอข้อมูล (รหัสผิด)
            res.render('login', { error: 'Username หรือ Password ไม่ถูกต้อง' });
        }
    });
});

app.get('/home', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    // เพิ่ม currentPage: 'home' เพื่อให้ Navbar รู้ว่าต้องไฮไลท์เมนูไหน
    res.render('home', { 
        user: req.session.user,
        currentPage: 'home' 
    });
});

const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/home'); // ถ้าไม่ใช่ admin ให้เด้งกลับไปหน้า home
    }
    next();
};

//หน้า Admin Tool
app.get('/admintool', requireAdmin, (req, res) => {
    const sql = `SELECT id, username, name, role FROM users`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }
        // เพิ่ม currentPage: 'admin' ตรงนี้ด้วยครับ
        res.render('admintool', { 
            dbUsers: rows, 
            user: req.session.user,
            currentPage: 'admin'
        });
    });
});

//Route เพิ่ม User
app.post('/admintool/add', requireAdmin, (req, res) => {
    const { username, password, name, role } = req.body;
    
    const sql = `INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`;
    db.run(sql, [username, password, name, role], function(err) {
        if (err) {
            console.error(err.message);
            // ในของจริงอาจจะส่งแจ้งเตือนกลับไปว่า Username ซ้ำ
        }
        res.redirect('/admintool');
    });
});

//Route ลบ User 
app.post('/admintool/delete/:id', requireAdmin, (req, res) => {
    const sql = `DELETE FROM users WHERE id = ?`;
    db.run(sql, req.params.id, function(err) {
        if (err) console.error(err.message);
        res.redirect('/admintool');
    });
});

//Route Update User 
app.post('/admintool/edit/:id', requireAdmin, (req, res) => {
    const { name, role } = req.body;
    const sql = `UPDATE users SET name = ?, role = ? WHERE id = ?`;
    
    db.run(sql, [name, role, req.params.id], function(err) {
        if (err) console.error(err.message);
        res.redirect('/admintool');
    });
});


<<<<<<< HEAD
// กำหนด Port และ Start Server
=======
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = 3000;
>>>>>>> origin/main
app.listen(PORT, () => {
    console.log(`GWMS Server started at http://localhost:${PORT}`);
});