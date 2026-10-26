const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 🔑 [ตั้งค่าระบบ Sendit / GB Prime Pay Unified API]
const SENDIT_CONFIG = {
    // ใส่ Secret Key และ Public Key ที่ได้จากหน้า Dashboard ของระบบ Sendit / GB Prime Pay
    secretKey: 'Lp-shop2026-xK93mQ7',
    publicKey: 'xnd_public_development_5rJMNQyM2F0lorNomqJQbqGUpnOdVOQN66HT4hOrUULqnFXaYCkeufBJp8FXHBEl',
    // URL สำหรับเชื่อมต่อ (ใช้ https://api.gbprimepay.com สำหรับระบบจริง Production)
    baseUrl: 'https://api.gbprimepay.com' 
};

// ตัวแปรเก็บสถานะออร์เดอร์กลางสำหรับเชื่อมโยงระหว่างพนักงานกับลูกค้าระหว่างเครื่อง
let currentOrder = { total: 0, status: 'idle', timestamp: 0 };

// API ขอ QR Code จาก Sendit
app.post('/api/create-bbl-qr', async (req, res) => {
    try {
        const { amount } = req.body;
        let amountStr = parseFloat(amount).toFixed(2);

        // 1. ขอ Token ยืนยันตัวตนจาก Sendit API ก่อน
        const tokenResponse = await axios.post(`${SENDIT_CONFIG.baseUrl}/unified/authToken/create`, {
            secretKey: SENDIT_CONFIG.secretKey,
            publicKey: SENDIT_CONFIG.publicKey
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!tokenResponse.data || !tokenResponse.data.authToken) {
            throw new Error('ไม่สามารถขอ Authentication Token จาก Sendit ได้');
        }

        const authToken = tokenResponse.data.authToken;

        // 2. ส่งคำสั่งสร้างรายการ QR Code (PromptPay / QR Cash) ผ่าน Unified API
        const transactionResponse = await axios.post(`${SENDIT_CONFIG.baseUrl}/unified/transaction`, {
            authToken: authToken,
            // กำหนดประเภทการชำระเงิน Q = QR Cash / PromptPay
            apiType: 'PC', 
            paymentType: 'Q', 
            amount: amountStr,
            referenceNo: 'TX-' + Date.now(),
            detail: 'Minimal Laundry Payment'
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const txnData = transactionResponse.data;

        // ตรวจสอบและดึงข้อมูล QR Code Payload ออกมาใช้งาน
        if (txnData && (txnData.qrCode || txnData.payload || txnData.qrImage)) {
            let qrString = txnData.qrCode || txnData.payload || txnData.qrImage;
            res.json({ success: true, qrData: qrString });
        } else {
            throw new Error('ไม่พบข้อมูล QR Code จากการตอบกลับของระบบ Sendit');
        }

    } catch (error) {
        console.error("Sendit API Error:", error.response?.data || error.message);
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
