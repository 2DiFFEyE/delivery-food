// main.js – корзина с localStorage и группировкой по ресторанам

const cartButton = document.querySelector("#cart-button");
const modal = document.querySelector(".modal");
const close = document.querySelector(".close");
const cancelButton = document.querySelector(".modal-footer .button:last-child");
const modalBody = document.querySelector(".modal-body");
const modalPricetag = document.querySelector(".modal-pricetag");
const orderButton = document.querySelector(".modal-footer .button-primary");
const filterSelect = document.querySelector("#restaurant-filter");

let cart = [];

// ---------- Работа с localStorage ----------
function saveCart() {
  try {
    localStorage.setItem('deliveryCart', JSON.stringify(cart));
  } catch (e) {
    console.warn('Не удалось сохранить корзину', e);
  }
}

function loadCart() {
  try {
    const data = localStorage.getItem('deliveryCart');
    if (data) {
      cart = JSON.parse(data);
      // Убедимся, что все элементы имеют корректные поля (на случай старых версий)
      cart = cart.filter(item => item.name && typeof item.price === 'number' && typeof item.quantity === 'number' && item.restaurant);
    } else {
      cart = [];
    }
  } catch (e) {
    cart = [];
  }
  // Обновляем фильтр и рендерим, если модалка открыта
  if (modal.classList.contains('is-open')) {
    updateFilterOptions();
    renderCart();
  }
}

// ---------- Определяем текущий ресторан ----------
function getCurrentRestaurant() {
  const titleEl = document.querySelector('.section-title');
  return titleEl ? titleEl.textContent.trim() : 'Неизвестный ресторан';
}

// ---------- Открытие/закрытие модалки ----------
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

// ---------- Работа с корзиной ----------
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

// ---------- Получение уникальных ресторанов ----------
function getUniqueRestaurants() {
  const restaurants = cart.map(item => item.restaurant);
  return [...new Set(restaurants)];
}

// ---------- Обновление выпадающего фильтра ----------
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

// ---------- Рендеринг корзины с группировкой и фильтром ----------
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

  // Группировка по ресторану
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

  // Обработчики для кнопок +/-
  modalBody.querySelectorAll('.counter-button').forEach(btn => {
    btn.addEventListener('click', function(e) {
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

// ---------- Обработчик кнопок "В корзину" (делегирование) ----------
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
        // Опционально: короткое уведомление
        // alert(`Добавлено: ${name} (${restaurant})`);
      }
    }
  }
});

// ---------- Фильтр по ресторану ----------
if (filterSelect) {
  filterSelect.addEventListener('change', function() {
    if (modal.classList.contains('is-open')) {
      renderCart();
    }
  });
}

// ---------- Оформление заказа ----------
if (orderButton) {
  orderButton.addEventListener('click', function() {
    if (cart.length === 0) {
      alert('Корзина пуста');
      return;
    }
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const restaurants = getUniqueRestaurants().join(', ');
    alert(`✅ Заказ оформлен на сумму ${total} ₽.\nРестораны: ${restaurants}\nСпасибо за заказ!`);
    clearCart();
    toggleModal();
  });
}

// ---------- ПОИСК НА ГЛАВНОЙ СТРАНИЦЕ ----------
const searchInput = document.querySelector('.input-search');
if (searchInput) {
  searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.card'); // все карточки ресторанов

    let hasVisible = false;
    cards.forEach(card => {
      const title = card.querySelector('.card-title');
      const category = card.querySelector('.category');
      let match = false;

      if (title && title.textContent.toLowerCase().includes(query)) {
        match = true;
      }
      if (category && category.textContent.toLowerCase().includes(query)) {
        match = true;
      }

      card.style.display = match ? '' : 'none';
      if (match) hasVisible = true;
    });

    // Опционально: показать сообщение, если ничего не найдено
    const noResultMsg = document.querySelector('.no-result');
    if (noResultMsg) {
      noResultMsg.style.display = hasVisible ? 'none' : 'block';
    } else if (!hasVisible) {
    }
  });
}

// ---------- Инициализация ----------
loadCart(); // Восстанавливаем корзину при загрузке
new WOW().init();