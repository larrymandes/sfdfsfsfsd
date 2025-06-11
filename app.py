from flask import Flask, render_template, request, jsonify
import psycopg2
import psycopg2.extras
import os
import json
import random
from datetime import datetime
import hashlib
import secrets
import base64

app = Flask(__name__)

# Подключение к PostgreSQL базе данных
DATABASE_URL = "postgresql://postgres:Evgenevich12!@82.202.141.209:5432/postgres"

# Соль для пароля и хешированный пароль
ADMIN_SALT = secrets.token_hex(16)  # Генерируем случайную соль
ADMIN_PASSWORD_HASH = hashlib.sha256(('1337' + ADMIN_SALT).encode()).hexdigest()

# Инициализация базы данных
def init_db():
    conn = psycopg2.connect(DATABASE_URL)
    c = conn.cursor()
    c.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id TEXT UNIQUE,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        photo_url TEXT,
        attempts INTEGER DEFAULT 0,
        won INTEGER DEFAULT 0,
        win_attempts INTEGER DEFAULT 0,
        last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Создаем таблицу для новостей, если её еще нет
    c.execute('''
    CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        date_text TEXT NOT NULL,
        content TEXT NOT NULL,
        image_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Проверяем, есть ли у нас хоть одна новость
    c.execute('SELECT COUNT(*) FROM news')
    news_count = c.fetchone()[0]
    
    # Если нет новостей, создаем тестовую новость
    if news_count == 0:
        c.execute('''
        INSERT INTO news (title, date_text, content, image_data)
        VALUES (%s, %s, %s, %s)
        ''', (
            'Похуй', 
            '11 июня 2077', 
            '<p>да крч хостинг бесплаптный поэтому очень все тормозит</p><p>сорянчик мне не выделили средства на него</p><p>увеличил шанс выигрыша с 1 процента до 5</p>',
            'https://i.pinimg.com/736x/29/0d/d7/290dd753cc82768b67c0a1ad3c8654ae.jpg'
        ))
    
    conn.commit()
    conn.close()

# Функция для получения соединения с БД
def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn

# Создаем базу данных при запуске
try:
    init_db()
    print("База данных успешно инициализирована")
except Exception as e:
    print(f"Ошибка при инициализации базы данных: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/game')
def game():
    return render_template('game.html')

@app.route('/participants')
def participants():
    return render_template('participants.html')

@app.route('/news')
def news():
    # Получаем последнюю новость из базы данных
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    c.execute('SELECT * FROM news ORDER BY created_at DESC LIMIT 1')
    news_item = c.fetchone()
    conn.close()
    
    # Если новость найдена, передаем её в шаблон
    if news_item:
        return render_template('news.html', news=dict(news_item))
    else:
        # Если новостей нет, показываем шаблон без данных
        return render_template('news.html')

@app.route('/api/save_user', methods=['POST'])
def save_user():
    data = request.json
    
    if not data or 'user' not in data:
        return jsonify({'success': False, 'error': 'Нет данных пользователя'}), 400
    
    user = data['user']
    telegram_id = user.get('id')
    
    if not telegram_id:
        return jsonify({'success': False, 'error': 'Отсутствует идентификатор пользователя Telegram'}), 400
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Проверяем, существует ли пользователь
    c.execute('SELECT * FROM users WHERE telegram_id = %s', (str(telegram_id),))
    existing_user = c.fetchone()
    
    if existing_user:
        # Обновляем время последнего посещения
        c.execute('''
            UPDATE users SET 
                last_visit = CURRENT_TIMESTAMP,
                username = %s,
                first_name = %s,
                last_name = %s,
                photo_url = %s
            WHERE telegram_id = %s
        ''', (
            user.get('username', ''),
            user.get('first_name', ''),
            user.get('last_name', ''),
            user.get('photo_url', ''),
            str(telegram_id)
        ))
    else:
        # Создаем нового пользователя
        c.execute('''
            INSERT INTO users (
                telegram_id, username, first_name, last_name, photo_url
            ) VALUES (%s, %s, %s, %s, %s)
        ''', (
            str(telegram_id),
            user.get('username', ''),
            user.get('first_name', ''),
            user.get('last_name', ''),
            user.get('photo_url', '')
        ))
    
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/try_luck', methods=['POST'])
def try_luck():
    data = request.json
    
    if not data or 'telegram_id' not in data:
        return jsonify({'success': False, 'error': 'Нет данных пользователя'}), 400
    
    telegram_id = data['telegram_id']
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Проверяем, выиграл ли пользователь ранее
    c.execute('SELECT won FROM users WHERE telegram_id = %s', (str(telegram_id),))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return jsonify({'success': False, 'error': 'Пользователь не найден'}), 404
    
    user_won = result[0]
    
    if user_won == 1:
        conn.close()
        return jsonify({'success': True, 'result': 'already_won'})
    
    # Увеличиваем счетчик попыток
    c.execute('UPDATE users SET attempts = attempts + 1 WHERE telegram_id = %s', (str(telegram_id),))
    
    # Шанс выигрыша 5%
    won = random.random() < 0.05
    
    if won:
        # Обновляем данные пользователя при выигрыше
        c.execute('''
            UPDATE users SET 
                won = 1,
                win_attempts = attempts
            WHERE telegram_id = %s
        ''', (str(telegram_id),))
    
    # Получаем текущее количество попыток
    c.execute('SELECT attempts FROM users WHERE telegram_id = %s', (str(telegram_id),))
    attempts = c.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'success': True,
        'result': 'won' if won else 'lost',
        'attempts': attempts
    })

@app.route('/api/get_winners', methods=['GET'])
def get_winners():
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    c.execute('''
        SELECT telegram_id, username, first_name, last_name, photo_url, win_attempts 
        FROM users 
        WHERE won = 1 
        ORDER BY win_attempts ASC
    ''')
    
    winners = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return jsonify({'success': True, 'winners': winners})

@app.route('/api/check_user_status', methods=['POST'])
def check_user_status():
    data = request.json
    
    if not data or 'telegram_id' not in data:
        return jsonify({'success': False, 'error': 'Нет данных пользователя'}), 400
    
    telegram_id = data['telegram_id']
    
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    c.execute('SELECT won, attempts, win_attempts FROM users WHERE telegram_id = %s', (str(telegram_id),))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return jsonify({'success': False, 'error': 'Пользователь не найден'}), 404
    
    status = dict(result)
    is_winner = status['won'] == 1
    
    # Для победителей используем win_attempts вместо attempts
    attempts_to_show = status['win_attempts'] if is_winner and status['win_attempts'] > 0 else status['attempts']
    
    conn.close()
    
    return jsonify({
        'success': True,
        'won': bool(status['won']),
        'attempts': attempts_to_show
    })

@app.route('/api/get_lazy_users', methods=['GET'])
def get_lazy_users():
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    c.execute('''
        SELECT telegram_id, username, first_name, last_name, photo_url, attempts 
        FROM users 
        WHERE won = 0
        ORDER BY attempts DESC
    ''')
    
    lazy_users = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return jsonify({'success': True, 'lazy_users': lazy_users})

@app.route('/admin', methods=['GET'])
def admin_page():
    return render_template('admin.html')

@app.route('/api/admin/delete_user', methods=['POST'])
def delete_user():
    data = request.json
    
    if not data or 'telegram_id' not in data:
        return jsonify({'success': False, 'error': 'Отсутствует ID пользователя'}), 400
    
    telegram_id = data['telegram_id']
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Удаляем пользователя по Telegram ID
        c.execute('DELETE FROM users WHERE telegram_id = %s', (str(telegram_id),))
        conn.commit()  # Добавляем коммит изменений
        
        if c.rowcount > 0:
            conn.close()
            return jsonify({'success': True})
        else:
            conn.close()
            return jsonify({'success': False, 'error': 'Пользователь не найден'}), 404
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/update_attempts', methods=['POST'])
def update_attempts():
    data = request.json
    
    if not data or 'telegram_id' not in data or 'attempts' not in data:
        return jsonify({'success': False, 'error': 'Неверные данные'}), 400
    
    telegram_id = data['telegram_id']
    attempts = data['attempts']
    
    if not isinstance(attempts, int) or attempts < 0:
        return jsonify({'success': False, 'error': 'Некорректное значение попыток'}), 400
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем, является ли пользователь победителем
        c.execute('SELECT won FROM users WHERE telegram_id = %s', (str(telegram_id),))
        user_data = c.fetchone()
        
        if not user_data:
            conn.close()
            return jsonify({'success': False, 'error': 'Пользователь не найден'}), 404
        
        is_winner = user_data[0] == 1
        
        # Обновляем оба поля - attempts и win_attempts
        # Это гарантирует согласованность данных
        if is_winner:
            c.execute('UPDATE users SET attempts = %s, win_attempts = %s WHERE telegram_id = %s', 
                     (attempts, attempts, str(telegram_id)))
        else:
            c.execute('UPDATE users SET attempts = %s WHERE telegram_id = %s', 
                     (attempts, str(telegram_id)))
        
        conn.commit()  # Добавляем коммит изменений
        
        if c.rowcount > 0:
            conn.close()
            return jsonify({'success': True})
        else:
            conn.close()
            return jsonify({'success': False, 'error': 'Не удалось обновить пользователя'}), 500
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/exclude_winner', methods=['POST'])
def exclude_winner():
    data = request.json
    
    if not data or 'telegram_id' not in data:
        return jsonify({'success': False, 'error': 'Отсутствует ID пользователя'}), 400
    
    telegram_id = data['telegram_id']
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем, является ли пользователь победителем и получаем его попытки
        c.execute('SELECT won, win_attempts FROM users WHERE telegram_id = %s', (str(telegram_id),))
        user_data = c.fetchone()
        
        if not user_data:
            conn.close()
            return jsonify({'success': False, 'error': 'Пользователь не найден'}), 404
        
        is_winner = user_data[0] == 1
        win_attempts = user_data[1] if user_data[1] is not None else 0
        
        # Если пользователь не победитель, возвращаем ошибку
        if not is_winner:
            conn.close()
            return jsonify({'success': False, 'error': 'Пользователь не является победителем'}), 400
        
        # Отменяем статус победителя и копируем win_attempts в attempts
        c.execute('UPDATE users SET won = 0, attempts = %s WHERE telegram_id = %s', 
                 (win_attempts, str(telegram_id)))
        
        conn.commit()  # Сохраняем изменения
        
        if c.rowcount > 0:
            conn.close()
            return jsonify({'success': True})
        else:
            conn.close()
            return jsonify({'success': False, 'error': 'Не удалось обновить пользователя'}), 500
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/check_admin_password', methods=['POST'])
def check_admin_password():
    password = request.json.get('password')
    if not password:
        return jsonify({'success': False, 'error': 'No password provided'}), 400
    
    # Хешируем введенный пароль с солью
    password_hash = hashlib.sha256((password + ADMIN_SALT).encode()).hexdigest()
    
    # Сравниваем хеши (безопасное сравнение)
    is_valid = secrets.compare_digest(password_hash, ADMIN_PASSWORD_HASH)
    
    if is_valid:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False})

@app.route('/api/admin/make_winner', methods=['POST'])
def make_winner():
    data = request.json
    
    if not data or 'telegram_id' not in data:
        return jsonify({'success': False, 'error': 'Отсутствует ID пользователя'}), 400
    
    telegram_id = data['telegram_id']
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем, является ли пользователь уже победителем
        c.execute('SELECT won, attempts FROM users WHERE telegram_id = %s', (str(telegram_id),))
        user_data = c.fetchone()
        
        if not user_data:
            conn.close()
            return jsonify({'success': False, 'error': 'Пользователь не найден'}), 404
        
        is_winner = user_data[0] == 1
        attempts = user_data[1] if user_data[1] is not None else 0
        
        # Если пользователь уже победитель, возвращаем ошибку
        if is_winner:
            conn.close()
            return jsonify({'success': False, 'error': 'Пользователь уже является победителем'}), 400
        
        # Делаем пользователя победителем и копируем attempts в win_attempts
        c.execute('UPDATE users SET won = 1, win_attempts = %s WHERE telegram_id = %s', 
                 (attempts, str(telegram_id)))
        
        conn.commit()  # Сохраняем изменения
        
        if c.rowcount > 0:
            conn.close()
            return jsonify({'success': True})
        else:
            conn.close()
            return jsonify({'success': False, 'error': 'Не удалось обновить пользователя'}), 500
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/get_news', methods=['GET'])
def get_news():
    conn = get_db_connection()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    c.execute('SELECT * FROM news ORDER BY created_at DESC LIMIT 1')
    news_item = c.fetchone()
    conn.close()
    
    if news_item:
        return jsonify({
            'success': True,
            'news': dict(news_item)
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Новости не найдены'
        }), 404

@app.route('/api/admin/update_news', methods=['POST'])
def update_news():
    data = request.json
    
    if not data or 'title' not in data or 'date_text' not in data or 'content' not in data or 'image_data' not in data:
        return jsonify({'success': False, 'error': 'Неверные данные'}), 400
    
    title = data['title']
    date_text = data['date_text']
    content = data['content']
    image_data = data['image_data']
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем наличие новости
        c.execute('SELECT id FROM news ORDER BY created_at DESC LIMIT 1')
        news_id = c.fetchone()
        
        if news_id:
            # Обновляем существующую новость
            c.execute('''
            UPDATE news SET 
                title = %s, 
                date_text = %s, 
                content = %s, 
                image_data = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            ''', (title, date_text, content, image_data, news_id[0]))
        else:
            # Создаем новую новость
            c.execute('''
            INSERT INTO news (title, date_text, content, image_data)
            VALUES (%s, %s, %s, %s)
            ''', (title, date_text, content, image_data))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True) 
