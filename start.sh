#!/bin/bash

echo "Starting GWMS System..."
echo "Checking Node.js version:"
node -v

# ตรวจสอบว่ามีโฟลเดอร์ node_modules หรือไม่ (-d คือเช็ค directory)
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Opening browser..."
# เช็คระบบปฏิบัติการเพื่อใช้คำสั่งเปิดเบราว์เซอร์ให้ถูกต้อง
if [[ "$OSTYPE" == "darwin"* ]]; then
    # สำหรับ macOS
    open "http://localhost:3000"
elif command -v xdg-open > /dev/null; then
    # สำหรับ Linux
    xdg-open "http://localhost:3000"
else
    echo "Please open http://localhost:3000 in your browser."
fi

echo "Running server..."
node index.js

# คำสั่งหยุดรอ (เหมือน pause ใน Windows)
read -n 1 -s -r -p "Press any key to continue..."
echo ""