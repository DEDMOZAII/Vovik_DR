from flask import Flask, render_template, request, redirect, url_for, session, jsonify

app = Flask(__name__)
# Встановіть секретний ключ для використання сесій
app.secret_key = 'your_super_secret_key_sudoku_minesweeper_find25_final_v3' 

# Константи
CORRECT_PASSWORD = "ПЕНСІЯ" 
PASSWORD_KEY = 'isAuthenticated'
ACHIEVEMENTS_KEY = 'achievements'
# !!! ЗАМІНІТЬ ЦЕ ПОСИЛАННЯ НА ВАШЕ СЕКРЕТНЕ ПОСИЛАННЯ GOOGLE DRIVE !!!
TARGET_LINK = "https://drive.google.com/file/d/13xaUS8NdAkOG-2U54bfg2Jop8j8NbGwj/view?usp=sharing" 

# Ініціалізація досягнень
def initialize_achievements():
    if ACHIEVEMENTS_KEY not in session:
        session[ACHIEVEMENTS_KEY] = {
            'minesweeper_cleared': False,
            'sudoku_solved': False,
            'find25_found': False
        }

@app.before_request
def before_request():
    initialize_achievements()

@app.route('/', methods=['GET', 'POST'])
def password_gate():
    if session.get(PASSWORD_KEY):
        return redirect(url_for('game_select'))
    
    error = None
    if request.method == 'POST':
        password = request.form['password']
        if password == CORRECT_PASSWORD:
            session[PASSWORD_KEY] = True
            return redirect(url_for('game_select'))
        else:
            error = 'Неправильний пароль. Спробуйте ще раз.'

    return render_template('password_gate.html', error=error)

@app.route('/select')
def game_select():
    if not session.get(PASSWORD_KEY):
        return redirect(url_for('password_gate'))
    
    achievements = session.get(ACHIEVEMENTS_KEY)
    all_completed = all(achievements.values())
    
    return render_template('game_select.html', achievements=achievements, all_completed=all_completed)

# --- Маршрути Ігор ---
@app.route('/minesweeper')
def minesweeper_game():
    if not session.get(PASSWORD_KEY):
        return redirect(url_for('password_gate'))
    return render_template('minesweeper.html')

@app.route('/sudoku')
def sudoku_game():
    if not session.get(PASSWORD_KEY):
        return redirect(url_for('password_gate'))
    return render_template('sudoku.html')

@app.route('/find25')
def find25_game():
    if not session.get(PASSWORD_KEY):
        return redirect(url_for('password_gate'))
    return render_template('find25.html')
# ---------------------

@app.route('/complete_task', methods=['POST'])
def complete_task():
    """API для оновлення статусу досягнень з JS."""
    if not session.get(PASSWORD_KEY):
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401

    data = request.get_json()
    task_key = data.get('task') 

    if task_key in session[ACHIEVEMENTS_KEY] and not session[ACHIEVEMENTS_KEY][task_key]:
        session[ACHIEVEMENTS_KEY][task_key] = True
        session.modified = True 
        
        all_completed = all(session[ACHIEVEMENTS_KEY].values())
        
        return jsonify({
            'success': True,
            'message': f'{task_key} completed!',
            'all_completed': all_completed
        })
    
    # Якщо вже завершено або недійсний ключ
    return jsonify({'success': True, 'message': f'{task_key} already completed or invalid key'}), 200


@app.route('/next_step')
def next_step():
    """Сторінка з посиланням, доступна після завершення всіх завдань."""
    if not session.get(PASSWORD_KEY):
        return redirect(url_for('password_gate'))

    achievements = session.get(ACHIEVEMENTS_KEY)
    all_completed = all(achievements.values())
    
    return render_template('next_step.html', 
                           all_completed=all_completed, 
                           target_link=TARGET_LINK,
                           achievements=achievements)


if __name__ == '__main__':
    app.run(debug=True)