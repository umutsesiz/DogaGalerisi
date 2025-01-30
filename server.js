const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Message = require('./models/Message');
const User = require('./models/User');
const Donation = require('./models/Donation');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'SECRET_KEY'; // Bu anahtarı daha güvenli bir hale getirin

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB Bağlantısı
mongoose.connect('mongodb://localhost:27017/dogagalerisi', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Kullanıcı kimlik doğrulama middleware'i
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Token gerekli!' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Geçersiz token!' });
        req.user = user; // Kullanıcı bilgilerini request'e ekle
        next();
    });
}

// API Endpoint'leri
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi!' });
    } catch (error) {
        res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'Kullanıcı bulunamadı.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Hatalı şifre.' });

        const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ message: 'Giriş başarılı!', token });
    } catch (error) {
        res.status(500).json({ error: 'Giriş sırasında bir hata oluştu.' });
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        const newMessage = new Message({ name, email, message });
        await newMessage.save();
        res.status(201).json({ message: 'Mesaj kaydedildi!' });
    } catch (error) {
        res.status(500).json({ error: 'Mesaj kaydedilemedi.' });
    }
});

app.post('/api/donate', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Geçerli bir bağış miktarı girin.' });
        }

        const donation = new Donation({
            userId: req.user.id,
            amount,
        });
        await donation.save();
        res.status(201).json({ message: 'Bağış başarılı!' });
    } catch (error) {
        res.status(500).json({ error: 'Bağış sırasında bir hata oluştu.' });
    }
});

app.get('/api/donations', authenticateToken, async (req, res) => {
    try {
        const donations = await Donation.find({ userId: req.user.id }).sort({ date: -1 });
        res.status(200).json(donations);
    } catch (error) {
        res.status(500).json({ error: 'Bağışları getirirken bir hata oluştu.' });
    }
});

// Sunucuyu başlat
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
