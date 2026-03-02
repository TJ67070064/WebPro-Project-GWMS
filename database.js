const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// สร้างหรือเชื่อมต่อฐานข้อมูล
const db = new sqlite3.Database(path.join(__dirname, 'users.db'), (err) => {
    if (err) {
        console.error('Error connecting to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// สร้างตาราง users ถ้ายังไม่มี
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    `);

    // เพิ่ม user admin
    db.run(`
        INSERT OR IGNORE INTO users (username, password)
        VALUES 
        ('admin', '1234'),
        ('test', '5678')
    `);
});

module.exports = db;