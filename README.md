# File Uploads API

โปรเจกต์ตามใบงาน Backend-FileUploads-Swagger-CRUD เฉพาะส่วน File Uploads ด้วย Express

## วิธีรัน

ใช้ Node.js 22 ขึ้นไป (ทดสอบด้วย Node.js 24) ใช้ file-type รุ่น 22 ผ่าน dynamic import แทนรุ่น 16 ในใบงาน เนื่องจากรุ่นเก่ามีช่องโหว่ใน parser

```sh
npm install
npm run dev
```

หรือ `npm start` แล้วเรียก API ที่ http://localhost:3000/api/files ด้วย curl หรือ Postman โปรเจกต์นี้เป็น REST API ไม่มีหน้าเว็บ

`PORT` เปลี่ยนพอร์ตได้ (ค่าเริ่มต้น 3000) และ `UPLOAD_DIR` เปลี่ยนที่เก็บไฟล์ได้ โดยใช้ absolute path

สคริปต์ start/dev โหลดค่าจาก `.env` ที่มีอยู่ในโปรเจกต์ หากนำโปรเจกต์ไปเครื่องใหม่ ให้สร้าง `.env` ที่มี `PORT=3000` ก่อนรัน

## File API

| Method | Path | การทำงาน |
| --- | --- | --- |
| POST | /api/files | ไฟล์เดียว ชื่อฟิลด์ `file` |
| POST | /api/files/multiple | สูงสุด 5 ไฟล์ ชื่อฟิลด์ `files` |
| GET | /api/files | รายการไฟล์ |
| GET | /api/files/{filename} | ดาวน์โหลด |
| DELETE | /api/files/{filename} | ลบ |

รับ JPEG, PNG, WebP และ PDF ขนาดไม่เกิน 5 MB ต่อไฟล์ ตรวจ MIME, นามสกุล และ magic bytes ให้ตรงกัน ตั้งชื่อใหม่ด้วย UUID และเก็บใน `uploads/` ซึ่งไม่เปิดเป็น static directory เมื่อไฟล์ในชุดไม่ผ่านการตรวจจะลบทั้งชุด

```sh
curl -F "file=@./avatar.png" http://localhost:3000/api/files
curl -F "files=@./a.png" -F "files=@./b.pdf" http://localhost:3000/api/files/multiple
curl http://localhost:3000/api/files
curl -OJ http://localhost:3000/api/files/FILENAME
curl -X DELETE -i http://localhost:3000/api/files/FILENAME
```

แทน `FILENAME` ด้วยค่า filename ที่ได้หลังอัปโหลด บน Windows PowerShell ใช้ `curl.exe` เพื่อหลีกเลี่ยง alias ของ PowerShell รุ่นเก่า

## ทดสอบ

```sh
npm test
```

ทดสอบ HTTP จริงบนพอร์ตชั่วคราวและโฟลเดอร์ชั่วคราว แยกจากไฟล์ที่ผู้ใช้อัปโหลด ครอบคลุม validation, upload/download/delete, จำกัดขนาด/จำนวน, ปลอมชนิดไฟล์, cleanup และ JSON 404

ตัวอย่างนี้ทำส่วนแบบฝึกหัด แนวทาง production ท้ายใบงาน เช่น authentication, rate limiting, antivirus, database และ object storage ยังไม่ได้เพิ่ม
