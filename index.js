const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // 1. เรียกใช้ sqlite3

const app = express();

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
                ('admin', '1234', 'Atom', 'admin'),
                ('staff1', '1234', 'Somchai', 'staff')`;
            db.run(insertData);
        });
    }
});

app.get('/', (req, res) => {
    res.render('login'); 
});

// 4. แก้ไข Route Login ให้ดึงข้อมูลจาก Database แทน Array
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล SQLite
    const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
    
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
    res.render('home', { user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`GWMS Server started at http://localhost:${PORT}`);
});