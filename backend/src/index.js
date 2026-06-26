import express from 'express';
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.json({ message: "Backend Đấu Giá đã sẵn sàng và bảo mật!" });
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});