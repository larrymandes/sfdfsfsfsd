# Telegram Web App - Розыгрыш

Это веб-приложение для Telegram, позволяющее проводить розыгрыши в чатах или каналах с вероятностью выигрыша 5%.

## Особенности

- Авторизация через Telegram WebApp
- Стильный черно-белый дизайн в стиле Apple с использованием SF Pro
- База данных SQLite для хранения информации о пользователях и результатах розыгрыша
- Вероятность выигрыша настроена на 5%
- Отображение списка победителей с количеством попыток

## Требования

- Python 3.7+
- Flask
- SQLite3

## Установка и запуск

1. Установите зависимости:

```bash
pip install flask
```

2. Запустите приложение:

```bash
python app.py
```

Приложение будет доступно по адресу `http://localhost:5000`.

## Интеграция с Telegram

Для использования приложения в Telegram:

1. Создайте бота через @BotFather
2. Настройте WebApp URL в настройках бота
3. Добавьте кнопку WebApp в меню бота или в сообщениях

## Структура проекта

```
.
├── app.py                 # Основной файл Flask приложения
├── users.db               # База данных SQLite (создается автоматически)
├── static                 # Статические файлы
│   ├── css
│   │   └── style.css      # Стили приложения
│   ├── js
│   │   └── app.js         # JavaScript логика
│   └── images             # Изображения
└── templates              # HTML шаблоны
    ├── index.html         # Начальная страница
    ├── game.html          # Страница розыгрыша
    └── participants.html  # Список победителей
```

## Настройка

Вероятность выигрыша можно изменить в файле `app.py`, найдя строку:

```python
# Шанс выигрыша 5%
won = random.random() < 0.05
```

И заменив значение 0.05 на необходимое (например, 0.1 для 10% шанса). 