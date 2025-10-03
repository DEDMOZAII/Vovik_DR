// static/find25.js

const Find25Game = (function () {
    const TOTAL_NUMBERS = 25;
    let nextNumber = 1;
    let gridNumbers = [];
    let startTime = null;
    let timerInterval = null;
    let gameActive = false;

    // Аудіо елементи
    const successS = document.getElementById('success');
    const errorS = document.getElementById('error');
    const finishS = document.getElementById('finish');
    const bgm = document.getElementById('find25_bgm'); // ОНОВЛЕНО

    // Елементи UI
    const gridElement = document.getElementById('find25-grid');
    const timerElement = document.getElementById('timer');
    const nextNumberElement = document.getElementById('next-number');
    const messageArea = document.getElementById('message-area');
    const volumeSlider = document.getElementById('volumeSlider');

    // --- 1. КЕРУВАННЯ ЗВУКОМ ---

    function applyVolumeToSE(volume) {
        const seVolume = volume * 0.7;
        if (successS) successS.volume = seVolume;
        if (errorS) errorS.volume = seVolume;
        if (finishS) finishS.volume = seVolume;
    }

    if (volumeSlider) {
        const initialVolume = parseFloat(volumeSlider.value);
        if (bgm) bgm.volume = initialVolume;
        applyVolumeToSE(initialVolume);

        volumeSlider.addEventListener('input', (event) => {
            const newVolume = parseFloat(event.target.value);
            if (bgm) bgm.volume = newVolume;
            applyVolumeToSE(newVolume);
        });
    }

    document.body.addEventListener('click', () => {
        if (bgm && bgm.paused) {
            bgm.play().catch(e => console.log("BGM auto-play blocked:", e));
        }
    }, { once: true });


    // --- 2. ЛОГІКА ГРИ ---

    function generateGrid() {
        gridNumbers = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);

        // Перемішування масиву
        for (let i = gridNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gridNumbers[i], gridNumbers[j]] = [gridNumbers[j], gridNumbers[i]];
        }
    }

    function renderGrid() {
        gridElement.innerHTML = '';
        gridNumbers.forEach(number => {
            const cell = document.createElement('div');
            cell.className = 'find25-cell';
            cell.textContent = number;
            cell.dataset.number = number;
            cell.addEventListener('click', handleCellClick);
            gridElement.appendChild(cell);
        });
    }

    function updateTimer() {
        const elapsed = Date.now() - startTime;
        const totalSeconds = elapsed / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const milliseconds = Math.floor((elapsed % 1000) / 10);

        timerElement.textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
    }

    function handleCellClick(event) {
        if (!gameActive) return;

        const clickedNumber = parseInt(event.target.dataset.number);

        if (clickedNumber === nextNumber) {
            // Правильний клік
            event.target.classList.add('found');

            if (successS) { successS.currentTime = 0; successS.play().catch(() => { }); }

            nextNumber++;
            nextNumberElement.textContent = nextNumber;

            if (nextNumber > TOTAL_NUMBERS) {
                // ПЕРЕМОГА
                endGame(true);
            }
        } else {
            // Неправильний клік
            if (errorS) { errorS.currentTime = 0; errorS.play().catch(() => { }); }

            event.target.style.backgroundColor = '#FF4D4D';
            setTimeout(() => {
                event.target.style.backgroundColor = '';
            }, 100);
        }
    }

    function startGame() {
        if (timerInterval) clearInterval(timerInterval);

        generateGrid();
        renderGrid();

        nextNumber = 1;
        nextNumberElement.textContent = nextNumber;
        timerElement.textContent = '00:00.00';
        messageArea.style.display = 'none';

        startTime = Date.now();
        gameActive = true;
        timerInterval = setInterval(updateTimer, 10);

        document.querySelectorAll('.find25-cell.found').forEach(cell => cell.classList.remove('found'));
    }

    function endGame(win) {
        gameActive = false;
        clearInterval(timerInterval);

        const finalTime = timerElement.textContent;
        showMessage(win, finalTime);

        if (win) {
            if (finishS) { finishS.currentTime = 0; finishS.play().catch(() => { }); }

            // ВИКЛИК ФУНКЦІЇ ДОСЯГНЕННЯ
            if (typeof postTaskCompletion === 'function') {
                postTaskCompletion('find25_found');
            }
        }
    }

    function showMessage(win, time) {
        let messageText = '';
        messageArea.classList.remove('win', 'error');

        if (win) {
            const evaluation = evaluateTime(time);
            messageText = `🎉 Успіх! Час: ${time}. ${evaluation}`;
            messageArea.classList.add('win');
        } else {
            messageText = 'Гра завершена.';
            messageArea.classList.add('error');
        }

        messageArea.textContent = messageText;
        messageArea.style.display = 'block';
    }

    // --- 3. АНАЛІЗ ЧАСУ ТА ГРАНИЦІ ---

    function evaluateTime(timeString) {
        const parts = timeString.split(/[:.]/);
        const totalSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 100;

        if (totalSeconds < 25) {
            return "Фантастичний результат! Ви – експерт!";
        } else if (totalSeconds < 30) {
            return "Дуже високий результат! На рівні чемпіона.";
        } else if (totalSeconds < 35) {
            return "Чудово! Ви значно кращі за середній рівень.";
        } else if (totalSeconds < 45) {
            return "Добре! Це міцний середній результат.";
        } else {
            return "Непогано. Практикуйтеся, і швидкість зросте!";
        }
    }

    return {
        startGame: startGame
    };
})();

window.onload = () => {
    window.find25Game = Find25Game;
    Find25Game.startGame();
};