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
        // Кешируем данные пользователя при получении
        const userData = tg.initDataUnsafe.user;
        localStorage.setItem('cachedUserData', JSON.stringify(userData));
        return userData;
    }
    
    // Пытаемся получить данные из кеша
    const cachedData = localStorage.getItem('cachedUserData');
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    
    return null;
}

// Отображение данных пользователя из кеша или Telegram API
function displayUserInfo() {
    // Сначала пытаемся загрузить из кеша
    const cachedData = localStorage.getItem('cachedUserData');
    if (cachedData) {
        const userData = JSON.parse(cachedData);
        document.getElementById('user-name').textContent = userData.first_name || 'Пользователь';
        if (userData.photo_url) {
            document.getElementById('user-avatar').src = userData.photo_url;
        }
    }
}

// Вызываем отображение данных немедленно, до полной загрузки страницы
displayUserInfo();

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

// Управление статусом админа
let adminClickCount = 0;
let isAdminMode = false;

// Функция для обработки нажатий на заголовок новостей
function handleNewsIconClick() {
    adminClickCount++;
    
    if (adminClickCount === 3) {
        // Перенаправляем на страницу админа
        window.location.href = '/admin';
        adminClickCount = 0;
        return;
    }
    
    // Сбрасываем счетчик через 2 секунды бездействия
    clearTimeout(window.adminClickTimer);
    window.adminClickTimer = setTimeout(() => {
        adminClickCount = 0;
    }, 2000);
}

// Показать уведомление для админа
function showAdminNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'admin-notification';
    notification.innerHTML = `
        <div class="admin-notification-icon">
            <i class="fas fa-shield-alt"></i>
        </div>
        <div class="admin-notification-text">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Обновление интерфейса для режима админа
function updateUIForAdminMode() {
    // Добавляем индикатор статуса админа рядом с никнеймом пользователя
    if (isAdminMode && !document.querySelector('.admin-status-indicator')) {
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            const statusIndicator = document.createElement('div');
            statusIndicator.className = 'admin-status-indicator';
            statusIndicator.innerHTML = '<i class="fas fa-shield-alt"></i> Admin';
            userInfo.appendChild(statusIndicator);
        }
    }
    
    // Обновляем интерфейс на странице участников
    setupParticipantsAdminUI();
}

// Настройка админ-функций на странице участников
function setupParticipantsAdminUI() {
    if (isAdminMode && window.location.pathname === '/participants') {
        const participantItems = document.querySelectorAll('.participant-item');
        
        participantItems.forEach(item => {
            // Добавляем обработчик нажатия на аватарку участника
            const avatar = item.querySelector('.user-avatar');
            if (avatar) {
                avatar.style.cursor = 'pointer';
                
                avatar.addEventListener('click', function(event) {
                    event.stopPropagation();
                    
                    // Получаем данные участника
                    const telegramId = item.dataset.telegramId;
                    if (!telegramId) return;
                    
                    // Показываем меню действий
                    showParticipantActionMenu(telegramId, event.clientX, event.clientY);
                });
            }
        });
    }
}

// Показать меню действий для участника
function showParticipantActionMenu(telegramId, x, y) {
    // Удаляем предыдущее меню, если есть
    const existingMenu = document.querySelector('.admin-dropdown-menu');
    if (existingMenu) {
        document.body.removeChild(existingMenu);
    }
    
    // Получаем позицию аватара пользователя
    const userAvatar = document.querySelector(`.participant-item[data-telegram-id="${telegramId}"] .user-avatar`);
    if (!userAvatar) return;
    
    const rect = userAvatar.getBoundingClientRect();
    
    // Получим информацию о статусе пользователя (победитель или нет)
    let isWinner = false;
    const userItem = document.querySelector(`.participant-item[data-telegram-id="${telegramId}"]`);
    if (userItem) {
        // Проверяем наличие иконки трофея, что указывает на победителя
        const trophyIcon = userItem.querySelector('.success-icon');
        isWinner = trophyIcon !== null;
    }
    
    // Создаем меню действий
    const menu = document.createElement('div');
    menu.className = 'admin-dropdown-menu';
    menu.innerHTML = `
        <div class="admin-action-item delete-user">
            <i class="fas fa-trash-alt"></i> Удалить
        </div>
        <div class="admin-action-item change-attempts-header">
            <i class="fas fa-edit"></i> Изменить попытки
        </div>
    `;
    
    // Добавляем кнопку "Исключить" только для победителей
    if (isWinner) {
        const excludeButton = document.createElement('div');
        excludeButton.className = 'admin-action-item exclude-winner';
        excludeButton.innerHTML = '<i class="fas fa-user-minus"></i> Исключить';
        menu.appendChild(excludeButton);
    }
    
    // Позиционируем меню справа от аватарки с фиксированной позицией
    menu.style.position = 'fixed';
    menu.style.left = `${rect.right + 10}px`;
    menu.style.top = `${rect.top}px`;
    
    // Проверяем, не выходит ли меню за границы экрана справа
    setTimeout(() => {
        const menuRect = menu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            // Если меню выходит за границы, располагаем его слева от аватарки
            menu.style.left = `${rect.left - menuRect.width - 10}px`;
        }
    }, 0);
    
    // Добавляем меню на страницу
    document.body.appendChild(menu);
    
    // Обработчик клика на "Удалить"
    const deleteBtn = menu.querySelector('.delete-user');
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Вы действительно хотите удалить этого участника?')) {
            try {
                // Обращаемся к API для удаления
                const response = await fetch('/api/admin/delete_user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ telegram_id: telegramId })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAdminNotification('Пользователь успешно удален');
                    
                    // Удаляем элемент из DOM
                    const userItem = document.querySelector(`.participant-item[data-telegram-id="${telegramId}"]`);
                    if (userItem) {
                        userItem.style.opacity = '0';
                        setTimeout(() => {
                            userItem.remove();
                        }, 300);
                    }
                } else {
                    showAdminNotification('Ошибка: ' + (result.error || 'Не удалось удалить'));
                }
            } catch (error) {
                showAdminNotification('Ошибка удаления: ' + error.message);
            }
            
            document.body.removeChild(menu);
        }
    });
    
    // Обработчик клика на "Изменить попытки"
    const changeAttemptsHeader = menu.querySelector('.change-attempts-header');
    changeAttemptsHeader.addEventListener('click', function() {
        // Проверяем, не добавлено ли уже поле ввода
        if (menu.querySelector('.admin-action-change-attempts')) {
            return; // Поле уже есть, не добавляем второе
        }
        
        // Скрываем текст кнопки
        this.style.display = 'none';
        
        // Создаем элемент с полем ввода
        const inputField = document.createElement('div');
        inputField.className = 'admin-action-change-attempts';
        inputField.innerHTML = `
            <input type="text" class="admin-input-small" id="attempts-input" pattern="[0-9]*" inputmode="numeric" placeholder="Число">
            <button class="admin-btn-small update-attempts-btn">OK</button>
        `;
        
        // Вставляем после кнопки "Изменить попытки"
        this.parentNode.insertBefore(inputField, this.nextSibling);
        
        // Фокус на поле ввода
        const input = menu.querySelector('#attempts-input');
        if (input) {
            input.focus();
            
            // Обработка нажатия Enter в поле ввода
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const updateBtn = menu.querySelector('.update-attempts-btn');
                    if (updateBtn) updateBtn.click();
                }
            });
        }
        
        // Обработчик кнопки OK
        const updateAttemptsBtn = menu.querySelector('.update-attempts-btn');
        if (updateAttemptsBtn) {
            updateAttemptsBtn.addEventListener('click', async () => {
                const attemptsInput = menu.querySelector('#attempts-input');
                const newAttempts = parseInt(attemptsInput.value);
                
                if (!isNaN(newAttempts) && newAttempts >= 0) {
                    try {
                        // Отключаем кнопку, чтобы предотвратить множественные отправки
                        updateAttemptsBtn.disabled = true;
                        updateAttemptsBtn.textContent = '...';
                        
                        // Отправляем запрос к API для изменения попыток
                        const response = await fetch('/api/admin/update_attempts', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                telegram_id: telegramId,
                                attempts: newAttempts
                            })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            // Сохраняем ссылку на меню локально для безопасного удаления
                            const menuToRemove = menu;
                            
                            // Безопасно удаляем меню, только если оно еще в DOM
                            if (document.body.contains(menuToRemove)) {
                                document.body.removeChild(menuToRemove);
                            }
                            
                            showAdminNotification('Попытки обновлены!');
                            
                            // Перезагружаем страницу через 1 секунду, чтобы увидеть изменения
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        } else {
                            showAdminNotification('Ошибка: ' + (result.error || 'Не удалось обновить'));
                        }
                    } catch (error) {
                        showAdminNotification('Ошибка обновления: ' + error.message);
                    }
                } else {
                    showAdminNotification('Введите корректное значение');
                }
            });
        }
    });
    
    // Обработчик для кнопки "Исключить"
    if (isWinner) {
        const excludeBtn = menu.querySelector('.exclude-winner');
        excludeBtn.addEventListener('click', async () => {
            if (confirm('Исключить этого пользователя из победителей?')) {
                try {
                    // Отключаем кнопку, чтобы предотвратить множественные отправки
                    excludeBtn.style.opacity = '0.7';
                    excludeBtn.style.pointerEvents = 'none';
                    
                    // Обращаемся к API для исключения
                    const response = await fetch('/api/admin/exclude_winner', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ telegram_id: telegramId })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Сохраняем ссылку на меню локально для безопасного удаления
                        const menuToRemove = menu;
                        
                        // Безопасно удаляем меню, только если оно еще в DOM
                        if (document.body.contains(menuToRemove)) {
                            document.body.removeChild(menuToRemove);
                        }
                        
                        showAdminNotification('Пользователь исключен из победителей!');
                        
                        // Перезагружаем страницу через 1 секунду
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        showAdminNotification('Ошибка: ' + (result.error || 'Не удалось исключить'));
                        excludeBtn.style.opacity = '';
                        excludeBtn.style.pointerEvents = '';
                    }
                } catch (error) {
                    showAdminNotification('Ошибка: ' + error.message);
                    excludeBtn.style.opacity = '';
                    excludeBtn.style.pointerEvents = '';
                }
            }
        });
    }
    
    // Закрытие меню при клике вне его
    document.addEventListener('click', function closeMenu(e) {
        if (menu && !menu.contains(e.target) && e.target !== userAvatar) {
            document.body.removeChild(menu);
            document.removeEventListener('click', closeMenu);
        }
    });
}

// Проверка статуса админа при загрузке страницы
function checkAdminStatus() {
    isAdminMode = sessionStorage.getItem('adminMode') === 'true';
    
    // Сбрасываем статус админа если мы на начальной странице
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        sessionStorage.removeItem('adminMode');
        isAdminMode = false;
    }
    
    if (isAdminMode) {
        updateUIForAdminMode();
    }
}

// Инициализация админ-функций
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем статус админа
    checkAdminStatus();
    
    // Добавляем обработчик нажатия на заголовок новостей
    const newsTitle = document.getElementById('news-title');
    if (newsTitle) {
        newsTitle.addEventListener('click', handleNewsIconClick);
        // Делаем так, чтобы курсор не менялся при наведении на заголовок
        newsTitle.style.cursor = 'default';
    }
}); 