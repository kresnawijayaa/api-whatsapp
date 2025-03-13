# WhatsApp API Documentation

## Base URL
```
http://your-server-ip:port
```

## Authentication
Semua endpoint memerlukan sesi WhatsApp yang sudah aktif.

---

## 1. **Login QR Code**
### **Endpoint:**
```
GET /login
```
### **Description:**
Mendapatkan QR code untuk login WhatsApp.
### **Response:**
#### Success (200 OK)
```json
{
  "status": "QR_READY",
  "qr": "base64-encoded-image"
}
```
#### Error (500 Internal Server Error)
```json
{
  "error": "Failed to generate QR code"
}
```

---

## 2. **Check WhatsApp Connection Status**
### **Endpoint:**
```
GET /status
```
### **Description:**
Mengecek status koneksi WhatsApp.
### **Response:**
#### Success (200 OK)
```json
{
  "status": "CONNECTED"
}
```
#### Not Connected (401 Unauthorized)
```json
{
  "status": "DISCONNECTED"
}
```

---

## 3. **Send Message**
### **Endpoint:**
```
POST /send-message
```
### **Description:**
Mengirim pesan ke nomor atau grup WhatsApp.
### **Request Body:**
```json
{
  "receiver": "6281234567890",  // atau "group-id@g.us"
  "message": "Halo, ini pesan uji coba!"
}
```
### **Response:**
#### Success (200 OK)
```json
{
  "status": "Message sent",
  "receiver": "6281234567890"
}
```
#### Error (400 Bad Request)
```json
{
  "error": "Invalid receiver format"
}
```

---

## 4. **Get List of Approval Requests**
### **Endpoint:**
```
GET /approval-requests
```
### **Description:**
Mendapatkan daftar permintaan approval dari database.
### **Response:**
#### Success (200 OK)
```json
[
  {
    "id": 1,
    "requester": "6281234567890",
    "status": "PENDING"
  }
]
```

---

## 5. **Approve Request**
### **Endpoint:**
```
POST /approve
```
### **Description:**
Menyetujui permintaan tertentu dan menghapusnya dari database.
### **Request Body:**
```json
{
  "id": 1
}
```
### **Response:**
#### Success (200 OK)
```json
{
  "status": "Request approved and deleted"
}
```
#### Error (404 Not Found)
```json
{
  "error": "Request ID not found"
}
```

---

## 6. **Logout & Clear Session**
### **Endpoint:**
```
GET /logout
```
### **Description:**
Keluar dari sesi WhatsApp dan menghapus sesi yang tersimpan.
### **Response:**
#### Success (200 OK)
```json
{
  "status": "Logged out successfully"
}
```
#### Error (500 Internal Server Error)
```json
{
  "error": "Failed to logout"
}
```

---

## Notes:
- Pastikan server dalam keadaan aktif sebelum melakukan request.
- Semua request dikirim dalam format JSON.
- Gunakan format nomor WhatsApp internasional tanpa tanda `+` (misalnya: `6281234567890`).

