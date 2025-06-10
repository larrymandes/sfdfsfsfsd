from flask import Flask, render_template, request, jsonify
import psycopg2
import psycopg2.extras
import os
import json
import random
from datetime import datetime

app = Flask(__name__)

# Подключение к PostgreSQL базе данных на Render.com
DATABASE_URL = "postgresql://base_ee7p_user:0ul4fTwsBo44cJz83xUo0aqaCRXh7eAL@dpg-d14au9u3jp1c73fgqjcg-a.frankfurt-postgres.render.com/base_ee7p"

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
    
    c.execute('SELECT won, attempts FROM users WHERE telegram_id = %s', (str(telegram_id),))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return jsonify({'success': False, 'error': 'Пользователь не найден'}), 404
    
    status = dict(result)
    conn.close()
    
    return jsonify({
        'success': True,
        'won': bool(status['won']),
        'attempts': status['attempts']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True) 
