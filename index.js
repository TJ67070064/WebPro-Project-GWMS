const { error } = require('console');
const express = require('express');
const app = express();
const path = require('path');
const PORT = 3000;

// ตั้งค่าให้ Express รู้จักโฟลเดอร์ public สำหรับเรียกใช้ไฟล์ CSS และรูปภาพ
app.use(express.static(path.join(__dirname, 'public')));

// ตั้งค่า EJS เป็น View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware สำหรับอ่านข้อมูลจาก Form (x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// หน้าแรกให้แสดงหน้า Login
app.get('/', (req, res) => {
    res.render('login'); 
});

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
    
    // Render ไฟล์ home.ejs พร้อมส่งข้อมูล userData ไปให้
    res.render('home', { user: userData });
});


// กำหนด Port และ Start Server
app.listen(PORT, () => {
    console.log(`GWMS Server started at http://localhost:${PORT}`);
});