const express = require("express");
const axios = require("axios");
const path = require("path");
const { Pool } = require("pg"); // ← ТОЛЬКО ОДИН РАЗ

const app = express();
const PORT = process.env.PORT || 8080;

const TOKEN = process.env.TELEGRAM_TOKEN || "8349164104:AAHUqUw8W8zfrnf6-xYujTtdqWNAzkBQ_Bc";

// ===== ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ =====
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
`).then(() => {
    console.log('✅ Таблица users готова');
}).catch(err => {
    console.error('❌ Ошибка создания таблицы:', err);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ===== ОТДАЁМ СТРАНИЦЫ =====
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/:page.html", (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send("Страница не найдена");
        }
    });
});

// ===== РЕГИСТРАЦИЯ =====
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        console.log("📝 Регистрация:", { name, email });

        const check = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ ok: false, message: "Пользователь уже существует" });
        }

        await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
            [name, email, password]
        );

        res.json({ ok: true, message: "Регистрация успешна!" });
    } catch (error) {
        console.error("❌ Ошибка регистрации:", error);
        res.status(500).json({ ok: false, message: "Ошибка сервера" });
    }
});

// ===== ВХОД =====
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("🔑 Вход:", { email });

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1 AND password = $2",
            [email, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ ok: false, message: "Неверный email или пароль" });
        }

        const user = result.rows[0];
        res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error("❌ Ошибка входа:", error);
        res.status(500).json({ ok: false, message: "Ошибка сервера" });
    }
});

// ===== ПРОВЕРКА БД =====
app.get("/api/check-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT COUNT(*) FROM users");
        res.json({
            ok: true,
            users: result.rows[0].count,
            message: "База данных работает!"
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ===== ВОССТАНОВЛЕНИЕ ПАРОЛЯ =====
app.post("/api/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, message: "Пользователь не найден" });
        }

        res.json({ ok: true, password: result.rows[0].password });
    } catch (error) {
        console.error("❌ Ошибка:", error);
        res.status(500).json({ ok: false, message: "Ошибка сервера" });
    }
});

// ===== ПРИЕМ ЗАКАЗОВ =====
app.post("/order", async (req, res) => {
    try {
        const { name, phone, address, items, total } = req.body;
        console.log("📦 Новый заказ:", req.body);

        const message = `
📦 **НОВЫЙ ЗАКАЗ!**

👤 **Имя:** ${name || "Не указано"}
📞 **Телефон:** ${phone || "Не указан"}
📍 **Адрес:** ${address || "Не указан"}

🛒 **Заказ:**
${items || "Нет товаров"}

💰 **Итого:** ${total || "0"} ₽
        `;

        if (global.chatIdAdmin) {
            await sendMessage(global.chatIdAdmin, message);
            console.log("✅ Заказ отправлен");
        } else {
            console.log("⚠️ Админ еще не написал /start");
        }

        res.json({ ok: true });
    } catch (error) {
        console.error("❌ Ошибка:", error);
        res.status(500).json({ ok: false });
    }
});

// ===== ОТПРАВКА В TELEGRAM =====
async function sendMessage(chatId, text) {
    try {
        await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: "Markdown"
        });
        console.log("✅ Сообщение отправлено");
    } catch (error) {
        console.error("❌ Ошибка отправки:", error.message);
    }
}

// ===== LONG POLLING =====
async function pollUpdates() {
    let offset = 0;
    console.log("🔄 Бот запущен в режиме Long Polling...");

    while (true) {
        try {
            const response = await axios.get(`https://api.telegram.org/bot${TOKEN}/getUpdates`, {
                params: { offset: offset, timeout: 30 }
            });

            const updates = response.data.result;
            for (const update of updates) {
                offset = update.update_id + 1;

                if (update.message && update.message.text === "/start") {
                    const chatId = update.message.chat.id;
                    global.chatIdAdmin = chatId;
                    console.log(`✅ chatId сохранен: ${chatId}`);
                    await sendMessage(chatId, "👋 Привет! Я бот доставки.\n\n📦 Теперь заказы с сайта будут приходить сюда!");
                }
            }
        } catch (error) {
            if (error.response && error.response.status === 409) {
                console.log("⚠️ Конфликт (409). Ждём 5 секунд и перезапускаем...");
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
            console.error("❌ Ошибка в Long Polling:", error.message);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// ===== ЗАПУСК =====
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🔄 Запускаем Long Polling...`);
    pollUpdates();
});