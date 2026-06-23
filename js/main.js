// ==========================================
// КОРЗИНА
// ==========================================

const cartButton = document.querySelector("#cart-button");
const modal = document.querySelector(".modal");
const close = document.querySelector(".close");
const cancelButton = document.querySelector(".modal-footer .button:last-child");
const modalBody = document.querySelector(".modal-body");
const modalPricetag = document.querySelector(".modal-pricetag");
const orderButton = document.querySelector(".modal-footer .button-primary");
const filterSelect = document.querySelector("#restaurant-filter");

let cart = [];

function saveCart() {
    localStorage.setItem('deliveryCart', JSON.stringify(cart));
}

function loadCart() {
    const data = localStorage.getItem('deliveryCart');
    if (data) {
        cart = JSON.parse(data);
        cart = cart.filter(item => item.name && typeof item.price === 'number' && typeof item.quantity === 'number' && item.restaurant);
    } else {
        cart = [];
    }
    if (modal.classList.contains('is-open')) {
        updateFilterOptions();
        renderCart();
    }
}

function getCurrentRestaurant() {
    const titleEl = document.querySelector('.section-title');
    return titleEl ? titleEl.textContent.trim() : 'Неизвестный ресторан';
}

function toggleModal() {
    modal.classList.toggle("is-open");
    if (modal.classList.contains("is-open")) {
        updateFilterOptions();
        renderCart();
    }
}

cartButton.addEventListener("click", toggleModal);
close.addEventListener("click", toggleModal);
cancelButton.addEventListener("click", toggleModal);

function addToCart(name, price, restaurant) {
    const existing = cart.find(item => item.name === name && item.price === price && item.restaurant === restaurant);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ name, price, quantity: 1, restaurant });
    }
    saveCart();
    if (modal.classList.contains("is-open")) {
        renderCart();
        updateFilterOptions();
    }
}

function removeFromCart(name, price, restaurant) {
    const index = cart.findIndex(item => item.name === name && item.price === price && item.restaurant === restaurant);
    if (index !== -1) {
        const item = cart[index];
        if (item.quantity > 1) {
            item.quantity -= 1;
        } else {
            cart.splice(index, 1);
        }
        saveCart();
        if (modal.classList.contains("is-open")) {
            renderCart();
            updateFilterOptions();
        }
    }
}

function clearCart() {
    cart = [];
    saveCart();
    if (modal.classList.contains("is-open")) {
        renderCart();
        updateFilterOptions();
    }
}

function getUniqueRestaurants() {
    const restaurants = cart.map(item => item.restaurant);
    return [...new Set(restaurants)];
}

function updateFilterOptions() {
    if (!filterSelect) return;
    const currentValue = filterSelect.value;
    const unique = getUniqueRestaurants();
    let options = '<option value="all">Все рестораны</option>';
    unique.forEach(r => {
        const selected = (r === currentValue) ? 'selected' : '';
        options += `<option value="${r}" ${selected}>${r}</option>`;
    });
    filterSelect.innerHTML = options;
}

function renderCart() {
    if (cart.length === 0) {
        modalBody.innerHTML = `<p style="text-align: center; color: #888; padding: 20px 0;">Корзина пуста</p>`;
        modalPricetag.textContent = "0 ₽";
        return;
    }

    const selectedRestaurant = filterSelect ? filterSelect.value : 'all';
    let filteredCart = cart;
    if (selectedRestaurant !== 'all') {
        filteredCart = cart.filter(item => item.restaurant === selectedRestaurant);
    }

    if (filteredCart.length === 0) {
        modalBody.innerHTML = `<p style="text-align: center; color: #888; padding: 20px 0;">Нет товаров из выбранного ресторана</p>`;
        modalPricetag.textContent = "0 ₽";
        return;
    }

    const groups = {};
    filteredCart.forEach(item => {
        if (!groups[item.restaurant]) groups[item.restaurant] = [];
        groups[item.restaurant].push(item);
    });

    let html = '';
    let total = 0;

    for (const [restaurant, items] of Object.entries(groups)) {
        html += `<div class="restaurant-group" style="margin-bottom: 15px;">`;
        html += `<h4 style="margin: 0 0 8px 0; font-size: 18px; color: #302C34; border-bottom: 1px solid #eee; padding-bottom: 5px;">${restaurant}</h4>`;
        items.forEach(item => {
            total += item.price * item.quantity;
            html += `
                <div class="food-row" data-name="${item.name}" data-price="${item.price}" data-restaurant="${item.restaurant}">
                    <span class="food-name">${item.name}</span>
                    <strong class="food-price">${item.price} ₽</strong>
                    <div class="food-counter">
                        <button class="counter-button" data-action="decrease">−</button>
                        <span class="counter">${item.quantity}</span>
                        <button class="counter-button" data-action="increase">+</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    modalBody.innerHTML = html;
    modalPricetag.textContent = total + " ₽";

    modalBody.querySelectorAll('.counter-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const foodRow = this.closest('.food-row');
            const name = foodRow.dataset.name;
            const price = parseFloat(foodRow.dataset.price);
            const restaurant = foodRow.dataset.restaurant;
            const action = this.dataset.action;
            if (action === 'increase') {
                addToCart(name, price, restaurant);
            } else if (action === 'decrease') {
                removeFromCart(name, price, restaurant);
            }
        });
    });
}

document.addEventListener('click', function(e) {
    const target = e.target.closest('.button-primary');
    if (target && target.querySelector('.button-card-text') &&
        target.querySelector('.button-card-text').textContent.trim() === 'В корзину') {
        const card = target.closest('.card');
        if (!card) return;
        const nameElement = card.querySelector('.card-title-reg');
        const priceElement = card.querySelector('.card-price-bold');
        if (nameElement && priceElement) {
            const name = nameElement.textContent.trim();
            const price = parseFloat(priceElement.textContent.replace('₽', '').trim());
            const restaurant = getCurrentRestaurant();
            if (!isNaN(price)) {
                addToCart(name, price, restaurant);
            }
        }
    }
});

if (filterSelect) {
    filterSelect.addEventListener('change', function() {
        if (modal.classList.contains('is-open')) {
            renderCart();
        }
    });
}

if (orderButton) {
    orderButton.addEventListener('click', function(e) {
        e.preventDefault();

        if (cart.length === 0) {
            alert('Корзина пуста!');
            return;
        }

        let itemsText = '';
        let total = 0;

        const groups = {};
        cart.forEach(item => {
            if (!groups[item.restaurant]) groups[item.restaurant] = [];
            groups[item.restaurant].push(item);
        });

        for (const [restaurant, items] of Object.entries(groups)) {
            itemsText += `\n🍽️ **${restaurant}**\n`;
            items.forEach(item => {
                itemsText += `  • ${item.name} x${item.quantity} - ${item.price * item.quantity} ₽\n`;
                total += item.price * item.quantity;
            });
        }

        const addressInput = document.querySelector('.input-addres');
        const address = addressInput ? addressInput.value : 'Адрес не указан';

        const orderData = {
            name: 'Клиент с сайта',
            phone: '+7 (999) 123-45-67',
            address: address,
            items: itemsText,
            total: total
        };

        fetch('/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.ok) {
                    alert('✅ Заказ успешно отправлен!');
                    clearCart();
                    toggleModal();
                } else {
                    alert('❌ Ошибка при отправке заказа. Попробуйте еще раз.');
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                alert('❌ Не удалось отправить заказ. Проверьте подключение к интернету.');
            });
    });
}

const searchInput = document.querySelector('.input-search');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.card');
        const noResultMsg = document.querySelector('.no-result');

        let hasVisible = false;

        cards.forEach(card => {
            const title = card.querySelector('.card-title')?.textContent?.toLowerCase() || '';
            const category = card.querySelector('.category')?.textContent?.toLowerCase() || '';
            const tag = card.querySelector('.card-tag')?.textContent?.toLowerCase() || '';
            const rating = card.querySelector('.raiting')?.textContent?.toLowerCase() || '';
            const price = card.querySelector('.price')?.textContent?.toLowerCase() || '';

            const match =
                title.includes(query) ||
                category.includes(query) ||
                tag.includes(query) ||
                rating.includes(query) ||
                price.includes(query);

            card.style.display = match ? '' : 'none';
            if (match) hasVisible = true;
        });

        if (noResultMsg) {
            noResultMsg.style.display = hasVisible ? 'none' : 'block';
        } else if (!hasVisible) {
            const cardsContainer = document.querySelector('.cards');
            if (cardsContainer && !document.querySelector('.no-result-dynamic')) {
                const msg = document.createElement('div');
                msg.className = 'no-result no-result-dynamic';
                msg.style.cssText = 'display: block; text-align: center; padding: 30px 0; font-size: 18px; color: #888; width: 100%;';
                msg.textContent = '😕 Ничего не найдено. Попробуйте изменить запрос.';
                cardsContainer.appendChild(msg);
            }
        } else {
            const dynamicMsg = document.querySelector('.no-result-dynamic');
            if (dynamicMsg) dynamicMsg.remove();
        }
    });
}

loadCart();


// ==========================================
// АВТОРИЗАЦИЯ (ПРОСТАЯ РАБОЧАЯ ВЕРСИЯ)
// ==========================================

// Ждём загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM загружен, запускаем авторизацию');

    // Находим все элементы
    const loginBtn = document.getElementById('loginBtnHeader');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const closeLogin = document.getElementById('closeLogin');
    const closeRegister = document.getElementById('closeRegister');
    const openRegisterBtn = document.getElementById('openRegisterBtn');
    const openLoginFromRegister = document.getElementById('openLoginFromRegister');
    const forgotPassword = document.getElementById('forgotPassword');

    // Функции
    function showLogin() {
        if (loginModal) loginModal.style.display = 'flex';
        if (registerModal) registerModal.style.display = 'none';
        console.log('🔓 Открыт вход');
    }

    function showRegister() {
        if (registerModal) registerModal.style.display = 'flex';
        if (loginModal) loginModal.style.display = 'none';
        console.log('📝 Открыта регистрация');
    }

    function closeAll() {
        if (loginModal) loginModal.style.display = 'none';
        if (registerModal) registerModal.style.display = 'none';
        console.log('🔒 Модалки закрыты');
    }

    // Кнопка "Войти" в шапке
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showLogin();
        });
        console.log('✅ Кнопка "Войти" привязана');
    } else {
        console.log('❌ Кнопка "Войти" не найдена!');
    }

    // Крестики
    if (closeLogin) closeLogin.addEventListener('click', closeAll);
    if (closeRegister) closeRegister.addEventListener('click', closeAll);

    // Переключение на регистрацию
    if (openRegisterBtn) {
        openRegisterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showRegister();
        });
    }

    // Переключение на вход
    if (openLoginFromRegister) {
        openLoginFromRegister.addEventListener('click', function(e) {
            e.preventDefault();
            showLogin();
        });
    }

    // Закрытие по клику вне модалки
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-login')) {
            closeAll();
        }
    });

    // Восстановление пароля
    if (forgotPassword) {
        forgotPassword.addEventListener('click', function(e) {
            e.preventDefault();
            const email = prompt('📧 Введите ваш email:');
            if (email) {
                const users = JSON.parse(localStorage.getItem('users')) || [];
                const user = users.find(u => u.email === email);
                if (user) {
                    alert(`🔑 Ваш пароль: ${user.password}`);
                } else {
                    alert('❌ Пользователь с таким email не найден');
                }
            }
        });
    }

    // ===== РЕГИСТРАЦИЯ =====
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('📝 Отправка регистрации...');

            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const passwordRepeat = document.getElementById('regPasswordRepeat').value;
            const agree = document.getElementById('regAgree').checked;

            // Проверки
            if (!name) { alert('❌ Введите имя'); return; }
            if (!email) { alert('❌ Введите email'); return; }
            if (!email.includes('@')) { alert('❌ Введите корректный email'); return; }
            if (password.length < 6) { alert('❌ Пароль должен быть минимум 6 символов'); return; }
            if (password !== passwordRepeat) { alert('❌ Пароли не совпадают'); return; }
            if (!agree) { alert('❌ Подтвердите согласие на обработку данных'); return; }

            // Сохраняем
            const users = JSON.parse(localStorage.getItem('users')) || [];
            if (users.find(u => u.email === email)) {
                alert('❌ Пользователь с таким email уже существует');
                return;
            }

            users.push({ name, email, password });
            localStorage.setItem('users', JSON.stringify(users));

            alert('✅ Регистрация успешна! Теперь войдите.');
            showLogin();
        });
    }

    // ===== ВХОД =====
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('🔑 Отправка входа...');

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            const users = JSON.parse(localStorage.getItem('users')) || [];
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                localStorage.setItem('currentUser', JSON.stringify(user));
                alert(`✅ Добро пожаловать, ${user.name}!`);
                closeAll();
                const btn = document.getElementById('loginBtnText');
                if (btn) btn.textContent = user.name;
            } else {
                alert('❌ Неверный email или пароль');
            }
        });
    }

    // ===== Проверка авторизации при загрузке =====
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const btn = document.getElementById('loginBtnText');
        if (btn) btn.textContent = currentUser.name;
        console.log(`👋 Привет, ${currentUser.name}!`);
    }
});