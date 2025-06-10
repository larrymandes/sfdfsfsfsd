// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// Если объект Telegram WebApp существует, инициализируем приложение
if (tg) {
    tg.ready();
    tg.expand();
}

// Получение данных пользователя
function getUserData() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        return tg.initDataUnsafe.user;
    }
    return null;
}

// Сохранение пользователя в базе данных
async function saveUserToDb() {
    const user = getUserData();

    if (!user) {
        console.error('Невозможно получить данные пользователя Telegram!');
        showErrorMessage('Невозможно получить данные пользователя. Пожалуйста, откройте приложение через Telegram.');
        return null;
    }

    try {
        const response = await fetch('/api/save_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user: user })
        });

        const data = await response.json();
        
        if (!data.success) {
            console.error('Ошибка при сохранении пользователя:', data.error);
            return null;
        }

        return user;
    } catch (error) {
        console.error('Ошибка при отправке данных пользователя:', error);
        return null;
    }
}

// Проверка статуса пользователя (выиграл ли уже)
async function checkUserStatus() {
    const user = getUserData();

    if (!user) {
        return { won: false, attempts: 0 };
    }

    try {
        const response = await fetch('/api/check_user_status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ telegram_id: user.id })
        });

        const data = await response.json();
        
        if (!data.success) {
            console.error('Ошибка при получении статуса пользователя:', data.error);
            return { won: false, attempts: 0 };
        }

        return {
            won: data.won,
            attempts: data.attempts
        };
    } catch (error) {
        console.error('Ошибка при получении статуса пользователя:', error);
        return { won: false, attempts: 0 };
    }
}

// Попытка испытать удачу
async function tryLuck() {
    const user = getUserData();

    if (!user) {
        showErrorMessage('Невозможно получить данные пользователя. Пожалуйста, откройте приложение через Telegram.');
        return null;
    }

    showLoading(true);

    try {
        const response = await fetch('/api/try_luck', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ telegram_id: user.id })
        });

        const data = await response.json();
        showLoading(false);
        
        if (!data.success) {
            console.error('Ошибка при попытке испытать удачу:', data.error);
            return null;
        }

        return data;
    } catch (error) {
        showLoading(false);
        console.error('Ошибка при попытке испытать удачу:', error);
        return null;
    }
}

// Получение списка победителей
async function getWinners() {
    try {
        const response = await fetch('/api/get_winners');
        const data = await response.json();
        
        if (!data.success) {
            console.error('Ошибка при получении списка победителей:', data.error);
            return [];
        }

        return data.winners;
    } catch (error) {
        console.error('Ошибка при получении списка победителей:', error);
        return [];
    }
}

// Показать индикатор загрузки
function showLoading(show = true) {
    let loadingElement = document.getElementById('loading');
    
    if (!loadingElement && show) {
        loadingElement = document.createElement('div');
        loadingElement.id = 'loading';
        loadingElement.className = 'loading';
        loadingElement.innerHTML = '<div class="loader"></div>';
        document.body.appendChild(loadingElement);
    } else if (loadingElement && !show) {
        loadingElement.remove();
    }
}

// Показать сообщение об ошибке
function showErrorMessage(message) {
    // Создаем элемент для сообщения об ошибке
    const errorElement = document.createElement('div');
    errorElement.style.position = 'fixed';
    errorElement.style.top = '20px';
    errorElement.style.left = '50%';
    errorElement.style.transform = 'translateX(-50%)';
    errorElement.style.backgroundColor = '#FF3B30';
    errorElement.style.color = '#fff';
    errorElement.style.padding = '12px 20px';
    errorElement.style.borderRadius = '10px';
    errorElement.style.fontSize = '16px';
    errorElement.style.fontWeight = '500';
    errorElement.style.boxShadow = '0 5px 15px rgba(255, 59, 48, 0.2)';
    errorElement.style.zIndex = '2000';
    errorElement.textContent = message;
    
    // Добавляем элемент в DOM
    document.body.appendChild(errorElement);
    
    // Удаляем элемент через 4 секунды
    setTimeout(() => {
        errorElement.style.opacity = '0';
        errorElement.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            errorElement.remove();
        }, 300);
    }, 4000);
} 