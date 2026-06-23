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

// ---------- WEBHOOK ДЛЯ TELEGRAM ----------
app.post("/telegram-webhook", async (req, res) => {
    const update = req.body;
    console.log("📩 Пришло обновление:", JSON.stringify(update));

    // Проверяем, есть ли сообщение
    if (!update.message) {
        console.log("⏭️ Нет сообщения, пропускаем");
        return res.sendStatus(200);
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;
    const username = update.message.from?.username || "без username";

    console.log(`💬 Сообщение от @${username} (chatId: ${chatId}): "${text}"`);

    // Сохраняем chatId для отправки заказов
    if (text === "/start") {
        global.chatIdAdmin = chatId;
        console.log(`✅ chatId сохранен: ${chatId}`);
        await sendMessage(chatId, "👋 Привет! Я бот доставки Delivery Food.\n\n📦 Теперь заказы с сайта будут приходить сюда!");
    } else {
        await sendMessage(chatId, "🤖 Напиши /start, чтобы я запомнил тебя и мог присылать заказы!");
    }

    res.sendStatus(200);
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
            console.log("✅ Заказ отправлен в Telegram");
        } else {
            console.log("⚠️ Админ еще не написал /start");
        }

        res.json({ ok: true, message: "Заказ успешно отправлен! 🎉" });
    } catch (error) {
        console.error("❌ Ошибка при обработке заказа:", error);
        res.status(500).json({ ok: false, message: "Ошибка" });
    }
});

// ---------- ФУНКЦИЯ ОТПРАВКИ ----------
async function sendMessage(chatId, text) {
    try {
        const response = await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: "Markdown"
        });
        console.log("✅ Сообщение отправлено в Telegram");
        return response.data;
    } catch (error) {
        console.error("❌ Ошибка отправки в Telegram:", error.response?.data || error.message);
    }
}

// ---------- ЗАПУСК ----------
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
});