const express = require('express');
const app = express();
const path = require('path');

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

// Route สำหรับตรวจสอบข้อมูล Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // จำลองการตรวจสอบสิทธิ์ (สามารถเปลี่ยนเป็นเช็คกับ Database ได้ภายหลัง)
    if (username === 'admin' && password === '1234') {
        // ถ้ารหัสผ่านถูกต้อง ให้พาไปหน้า Dashboard (ที่กำลังจะสร้าง)
        res.redirect('/home'); 
    } else {
        // ถ้าผิดพลาด ให้ส่งข้อความ error กลับไปแสดงผลที่หน้าเดิม
        res.render('login', { error: 'Username หรือ Password ไม่ถูกต้อง' });
    }
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
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`GWMS Server started at http://localhost:${PORT}`);
});