const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname)));

const BBL_CONFIG = {
    companyCode: 'BBLBPM',
    serviceCode: 'OTRRPQR'
};

// ตัวแปรกลางเก็บบิลล่าสุดบนเซิร์ฟเวอร์ (เพื่อให้มือถือ/แท็บเล็ตต่างเครื่องกันดึงข้อมูลตรงกันได้)
let currentOrder = { total: 0, status: 'idle', timestamp: 0 };

function calculateCRC16(str) {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) { crc = (crc << 1) ^ 0x1021; } 
            else { crc = crc << 1; }
        }
    }
    let hex = (crc & 0xFFFF).toString(16).toUpperCase();
    return "0000".substr(0, 4 - hex.length) + hex;
}

// API สร้าง PromptPay QR Code
app.post('/api/create-bbl-qr', (req, res) => {
    try {
        const { amount } = req.body;
        let amountStr = parseFloat(amount).toFixed(2);
        
        let payload = "";
        payload += "000201"; 
        payload += "010212"; 
        
        let merchantAccount = "";
        merchantAccount += "0016A000000677010111"; 
        merchantAccount += "01" + String(BBL_CONFIG.companyCode.length).padStart(2, '0') + BBL_CONFIG.companyCode;
        merchantAccount += "02" + String(BBL_CONFIG.serviceCode.length).padStart(2, '0') + BBL_CONFIG.serviceCode;
        merchantAccount += "030200";
        
        payload += "29" + String(merchantAccount.length).padStart(2, '0') + merchantAccount;
        payload += "5303764"; 
        payload += "54" + String(amountStr.length).padStart(2, '0') + amountStr; 
        payload += "5802TH"; 
        payload += "6304"; 
        
        let crc = calculateCRC16(payload);
        let finalQrPayload = payload + crc;

        res.json({ success: true, qrData: finalQrPayload });
    } catch (error) {
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
