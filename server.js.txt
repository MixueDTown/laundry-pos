const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());

// ให้บริการไฟล์หน้าเว็บ POS จากโฟลเดอร์เดียวกัน
app.use(express.static(path.join(__dirname)));

// ข้อมูลการเชื่อมต่อ Bill Payment ของธนาคารกรุงเทพ (ข้อมูลอย่างเป็นทางการของคุณ)
const BBL_CONFIG = {
    companyCode: 'BBLBPM',
    serviceCode: 'OTRRPQR'
};

// ฟังก์ชันคำนวณ CRC16 มาตรฐาน PromptPay
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

// API สำหรับสร้าง PromptPay Bill Payment Payload
app.post('/api/create-bbl-qr', (req, res) => {
    try {
        const { amount } = req.body;
        let amountStr = parseFloat(amount).toFixed(2);
        
        let payload = "";
        payload += "000201"; 
        payload += "010212"; 
        
        let merchantAccount = "";
        merchantAccount += "0016A000000677010111"; 
        
        let companyCode = BBL_CONFIG.companyCode;
        merchantAccount += "01" + String(companyCode.length).padStart(2, '0') + companyCode;
        
        let serviceCode = BBL_CONFIG.serviceCode;
        merchantAccount += "02" + String(serviceCode.length).padStart(2, '0') + serviceCode;

        let ref2 = "00";
        merchantAccount += "03" + String(ref2.length).padStart(2, '0') + ref2;
        
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
