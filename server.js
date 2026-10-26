const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 🔑 [จุดที่ต้องใส่ข้อมูล] ข้อมูลการเชื่อมต่อ GB Prime Pay
const GB_CONFIG = {
    // ใส่ Token หรือ API Key ที่ได้มาจากระบบ GB Prime Pay ของคุณตรงนี้
    token: 'ใส่_GBPRIME_TOKEN_ของคุณตรงนี้', 
    // ถ้าใช้งานแบบทดสอบ (Sandbox) ให้ใช้ URL ทดสอบ, ถ้าใช้งานจริง (Live) ให้เปลี่ยนเป็น https://api.gbprimepay.com/v1/qrCode
    apiUrl: 'https://api.gbprimepay.com/v1/qrCode' 
};

// ตัวแปรเก็บสถานะออร์เดอร์กลางสำหรับเชื่อมโยงระหว่างพนักงานกับลูกค้าระหว่างเครื่อง
let currentOrder = { total: 0, status: 'idle', timestamp: 0 };

// API ขอ QR Code จาก GB Prime Pay
app.post('/api/create-bbl-qr', async (req, res) => {
    try {
        const { amount } = req.body;
        let amountStr = parseFloat(amount).toFixed(2);

        // สร้างข้อมูลส่งไปที่ GB Prime Pay API
        // (รูปแบบ Payload ตามมาตรฐาน API ของ GB Prime Pay สำหรับการสร้าง QR PromptPay)
        const response = await axios.post(GB_CONFIG.apiUrl, {
            token: GB_CONFIG.token,
            amount: amountStr,
            referenceNo: 'TX-' + Date.now(),
            detail: 'Minimal Laundry Payment'
        }, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(GB_CONFIG.token + ':').toString('base64'),
                'Content-Type': 'application/json'
            }
        });

        // ตรวจสอบข้อมูลที่ได้กลับมาจาก GB Prime Pay
        if (response.data && response.data.qrCode) {
            res.json({ success: true, qrData: response.data.qrCode });
        } else {
            // กรณีที่โครงสร้าง API ตอบกลับมาในรูปแบบอื่น (เช่น ข้อความดิบหรือรูปภาพ Base64)
            res.json({ success: true, qrData: response.data.qrCode || response.data.payload });
        }

    } catch (error) {
        console.error("GB Prime Pay Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// API สำหรับบันทึกออร์เดอร์ฝั่งพนักงาน
app.post('/api/set-order', (req, res) => {
    currentOrder = {
        total: req.body.total,
        status: req.body.status,
        timestamp: Date.now()
    };
    res.json({ success: true, currentOrder });
});

// API สำหรับให้จอลูกค้าดึงสถานะออร์เดอร์ปัจจุบัน
app.get('/api/get-order', (req, res) => {
    res.json({ success: true, currentOrder });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
