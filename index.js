const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ Токен бота (лучше вынести в переменные окружения)
const TOKEN = process.env.TELEGRAM_TOKEN || "8349164104:AAHUqUw8W8zfrnf6-xYujTtdqWNAzkBQ_Bc";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📁 Отдаем статические файлы (CSS, JS, картинки)
app.use(express.static(__dirname));

// 📄 Отдаем HTML-страницы
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Автоматически отдаем все .html файлы
app.get("/:page.html", (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send("Страница не найдена");
        }
    });
});

// 🤖 Webhook для Telegram
app.post("/telegram-webhook", async (req, res) => {
    const update = req.body;
    console.log("📩 Пришло обновление:", update);

    if (!update.message) {
        return res.sendStatus(200);
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;

    console.log("💬 Текст:", text);

    if (text === "/start") {
        await sendMessage(chatId, "👋 Привет! Я бот доставки Delivery Food.\n\n📦 Заказы с сайта будут приходить сюда.");
    } else {
        await sendMessage(chatId, "🤖 Я пока что умею только получать заказы с сайта. Напиши /start, чтобы проверить, что я жив!");
    }

    res.sendStatus(200);
});

// 📦 Эндпоинт для принятия заказов с сайта
app.post("/order", async (req, res) => {
    try {
        const { name, phone, address, items, total } = req.body;

        console.log("📦 Новый заказ:", req.body);

        // Формируем сообщение для Telegram
        const message = `
📦 **НОВЫЙ ЗАКАЗ!**

👤 **Имя:** ${name || "Не указано"}
📞 **Телефон:** ${phone || "Не указан"}
📍 **Адрес:** ${address || "Не указан"}

🛒 **Заказ:**
${items || "Нет товаров"}

💰 **Итого:** ${total || "0"} ₽
        `;

        // Отправляем админу (сохраняем chatId из /start)
        // Если chatIdAdmin еще не сохранен, отправляем в тот же чат, откуда пришел /start
        if (global.chatIdAdmin) {
            await sendMessage(global.chatIdAdmin, message);
        } else {
            console.log("⚠️ Админ еще не написал /start, заказ сохранен в логах");
            // Можно сохранить в файл или БД
        }

        res.json({ 
            ok: true, 
            message: "Заказ успешно отправлен! 🎉" 
        });
    } catch (error) {
        console.error("❌ Ошибка при обработке заказа:", error);
        res.status(500).json({ 
            ok: false, 
            message: "Ошибка при отправке заказа" 
        });
    }
});

// Функция отправки сообщений в Telegram
async function sendMessage(chatId, text) {
    try {
        await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: "Markdown"
        });
        console.log("✅ Сообщение отправлено в Telegram");
    } catch (error) {
        console.error("❌ Ошибка отправки в Telegram:", error.message);
    }
}

// Запоминаем chatId, когда пользователь пишет /start
app.post("/telegram-webhook", async (req, res) => {
    const update = req.body;
    
    if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text;

        // Сохраняем chatId для отправки заказов
        if (text === "/start") {
            global.chatIdAdmin = chatId;
            await sendMessage(chatId, "👋 Привет! Я бот доставки Delivery Food.\n\n📦 Теперь заказы с сайта будут приходить сюда!");
        }
    }
    
    res.sendStatus(200);
});

// 🚀 Запускаем сервер
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Открывай: http://localhost:${PORT}`);
});