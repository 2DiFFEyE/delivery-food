const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

const TOKEN = process.env.TELEGRAM_TOKEN || "8349164104:AAHUqUw8W8zfrnf6-xYujTtdqWNAzkBQ_Bc";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ---------- ОТДАЕМ СТРАНИЦЫ ----------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/:page.html", (req, res) => {
    const filePath = path.join(__dirname, `${req.params.page}.html`);
    res.sendFile(filePath, (err) => err && res.status(404).send("Страница не найдена"));
});

// ---------- ПРИЕМ ЗАКАЗОВ ----------
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

// ---------- ФУНКЦИЯ ОТПРАВКИ ----------
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

// ---------- LONG POLLING: Бот САМ забирает сообщения ----------
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

// ---------- ЗАПУСК ----------
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`🔄 Запускаем Long Polling...`);
    pollUpdates(); // Запускаем бота
});