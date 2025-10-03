// static/minesweeper.js

// --- 1. КОНФІГУРАЦІЯ ГРИ ---
const ROWS = 16;
const COLS = 30;
const MINES = 99;
const TILE_SIZE = 30; // Розмір клітинки в пікселях
const CANVAS_WIDTH = COLS * TILE_SIZE;
const CANVAS_HEIGHT = ROWS * TILE_SIZE;

// --- 2. ГЛОБАЛЬНІ ЗМІННІ ---
let canvas, ctx;
let board;
let gameActive = false;
let minesFound = 0;
let tilesRevealed = 0;
let timerInterval;
let startTime;
let firstClickMade = false; // Відстеження першого кліку

// --- 3. АУДІО ЕЛЕМЕНТИ ТА КЕРУВАННЯ ЗВУКОМ ---
const explosionS = document.getElementById('explosion');
const clickS = document.getElementById('click');
const flagS = document.getElementById('flag');
const winS = document.getElementById('win');
const bgm = document.getElementById('bgm');
const volumeSlider = document.getElementById('volumeSlider');

window.onload = function () {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Встановлення розміру canvas
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Обробники подій
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    setupVolumeControl();
    initializeGame();
};

function setupVolumeControl() {
    function applyVolumeToSE(volume) {
        const seVolume = volume * 0.7;
        if (explosionS) explosionS.volume = seVolume;
        if (clickS) clickS.volume = seVolume;
        if (flagS) flagS.volume = seVolume * 0.5;
        if (winS) winS.volume = seVolume;
    }

    if (volumeSlider) {
        const initialVolume = parseFloat(volumeSlider.value);
        if (bgm) bgm.volume = initialVolume * 0.5;
        applyVolumeToSE(initialVolume);

        volumeSlider.addEventListener('input', (event) => {
            const newVolume = parseFloat(event.target.value);
            if (bgm) bgm.volume = newVolume * 0.5;
            applyVolumeToSE(newVolume);
        });
    }

    document.body.addEventListener('click', () => {
        if (bgm && bgm.paused) {
            bgm.play().catch(e => console.log("BGM auto-play blocked:", e));
        }
    }, { once: true });
}

function initializeGame() {
    board = [];
    gameActive = true;
    minesFound = 0;
    tilesRevealed = 0;
    firstClickMade = false;

    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay('00:00');

    createEmptyBoard();
    calculateNeighbors(); // Початкове заповнення нулями
    drawBoard();
}

window.restartGame = initializeGame;

// --- 4. ЛОГІКА СТВОРЕННЯ ПОЛЯ (ЗАСИЛЕННЯ ПЕРШОГО КЛІКУ) ---

function createEmptyBoard() {
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            board[r][c] = {
                mine: false,
                revealed: false,
                flagged: false,
                neighborCount: 0,
                exploded: false,
                wrongFlag: false
            };
        }
    }
}

/**
 * Розміщує міни, гарантуючи, що клітинка (firstR, firstC) та її сусіди будуть безпечними.
 */
function placeMines(firstR, firstC) {
    let mineCount = 0;
    const safeCells = new Set();

    // Позначити першу клітинку та її сусідів як безпечні
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const nr = firstR + dr;
            const nc = firstC + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                safeCells.add(`${nr},${nc}`);
            }
        }
    }

    while (mineCount < MINES) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        const key = `${r},${c}`;

        // Розміщувати міну лише якщо клітинка не містить міни і не є безпечною зоною
        if (!board[r][c].mine && !safeCells.has(key)) {
            board[r][c].mine = true;
            mineCount++;
        }
    }
}

/**
 * Перераховує сусідні міни для всього поля.
 */
function calculateNeighbors() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            board[r][c].neighborCount = 0;
            if (board[r][c].mine) continue;

            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;

                    const nr = r + dr;
                    const nc = c + dc;

                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                        if (board[nr][nc].mine) {
                            count++;
                        }
                    }
                }
            }
            board[r][c].neighborCount = count;
        }
    }
}


// --- 5. ОБРОБНИКИ ПОДІЙ ТА ЛОГІКА КЛІКІВ ---

function getTileCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const c = Math.floor(x / TILE_SIZE);
    const r = Math.floor(y / TILE_SIZE);
    return { r, c };
}

function handleMouseDown(e) {
    if (!gameActive) return;

    const { r, c } = getTileCoords(e);

    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

    if (e.button === 0) { // Лівий клік
        if (!firstClickMade) {
            // ПЕРШИЙ КЛІК: розміщення мін, перерахунок, запуск таймера
            placeMines(r, c);
            calculateNeighbors();
            startTimer();
            firstClickMade = true;
            revealTile(r, c);
        } else if (board[r][c].revealed) {
            // Клік на розкритій цифрі (Chord Reveal)
            chordReveal(r, c);
        } else {
            // Звичайне розкриття
            revealTile(r, c);
        }
    } else if (e.button === 2) { // Правий клік
        toggleFlag(r, c);
    }

    checkWin();
    drawBoard();
}

function revealTile(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c].revealed || board[r][c].flagged) {
        return;
    }

    const tile = board[r][c];

    if (tile.mine) {
        handleLoss(r, c);
        return;
    }

    tile.revealed = true;
    tilesRevealed++;

    if (clickS) { clickS.currentTime = 0; clickS.play().catch(() => { }); }

    // Рекурсивне розкриття сусідів
    if (tile.neighborCount === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                revealTile(r + dr, c + dc);
            }
        }
    }
}

/**
 * Функція для "Chord Reveal" (натискання на цифру).
 */
function chordReveal(r, c) {
    const tile = board[r][c];
    if (!tile.revealed || tile.neighborCount === 0) return;

    let flagCount = 0;
    const neighbors = [];

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;

            const nr = r + dr;
            const nc = c + dc;

            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                const neighbor = board[nr][nc];
                neighbors.push({ r: nr, c: nc, tile: neighbor });
                if (neighbor.flagged) {
                    flagCount++;
                }
            }
        }
    }

    if (flagCount === tile.neighborCount) {
        // Кількість прапорців збігається, розкриваємо нерозкриті клітинки
        for (const neighbor of neighbors) {
            if (!neighbor.tile.flagged && !neighbor.tile.revealed) {
                // ВАЖЛИВО: Викликаємо revealTile, який перевірить на міну
                revealTile(neighbor.r, neighbor.c);

                // Якщо гра закінчилася (програш у revealTile), виходимо
                if (!gameActive) return;
            }
        }
    }
}

function toggleFlag(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c].revealed) {
        return;
    }

    const tile = board[r][c];
    tile.flagged = !tile.flagged;

    if (tile.flagged) {
        minesFound++;
        if (flagS) { flagS.currentTime = 0; flagS.play().catch(() => { }); }
    } else {
        minesFound--;
    }
}


// --- 6. ПЕРЕВІРКА СТАНУ ГРИ ---

function checkWin() {
    const safeTiles = (ROWS * COLS) - MINES;

    if (tilesRevealed === safeTiles && gameActive) {
        handleWin();
    }
}

function handleWin() {
    gameActive = false;
    clearInterval(timerInterval);

    revealAllMines();
    drawBoard();

    if (winS) { winS.currentTime = 0; winS.play().catch(() => { }); }

    const finalTime = document.getElementById('timerDisplay').textContent.replace('Час: ', '');
    alert(`🎉 Перемога! Ви очистили поле за ${finalTime}!`);

    // Надсилання досягнення на сервер
    if (typeof postTaskCompletion === 'function') {
        postTaskCompletion('minesweeper_cleared');
    }
}

function handleLoss(r, c) {
    gameActive = false;
    clearInterval(timerInterval);

    revealAllMines(true); // Розкрити всі міни та показати помилки прапорців

    // Підсвітити міну, на якій програв
    board[r][c].exploded = true;

    if (explosionS) { explosionS.currentTime = 0; explosionS.play().catch(() => { }); }
    drawBoard();
    alert("💣 БУМ! Гру закінчено. Спробуйте ще раз.");
}

function revealAllMines(showMistakes = false) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = board[r][c];
            if (tile.mine) {
                tile.revealed = true;
            } else if (showMistakes && tile.flagged && !tile.mine) {
                // Показати неправильний прапорець (якщо програш)
                tile.wrongFlag = true;
            }
        }
    }
}


// --- 7. ТАЙМЕР ---

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    updateTimerDisplay(timeString);
}

function updateTimerDisplay(timeString) {
    let timerEl = document.getElementById('timerDisplay');
    // Створення елемента, якщо він не існує (якщо він не вбудований у Control Panel)
    if (!timerEl) {
        const controlPanel = document.querySelector('.control-panel');
        if (!controlPanel) return; // Якщо немає панелі, не створюємо

        timerEl = document.createElement('div');
        timerEl.id = 'timerDisplay';
        timerEl.style.fontSize = '1.2em';
        timerEl.style.fontWeight = 'bold';
        timerEl.style.color = '#F8B400';
        timerEl.textContent = 'Час: 00:00';

        // Знайти місце для вставки (наприклад, після заголовка)
        const h2 = controlPanel.querySelector('h2');
        if (h2) {
            controlPanel.insertBefore(timerEl, h2.nextSibling);
        } else {
            controlPanel.appendChild(timerEl);
        }
    }
    timerEl.textContent = `Час: ${timeString}`;
}


// --- 8. РЕНДЕРИНГ НА CANVAS ---

const TILE_COLORS = [
    'transparent',
    '#0000FF',     // 1 (Синій)
    '#008000',     // 2 (Зелений)
    '#FF0000',     // 3 (Червоний)
    '#000080',     // 4 (Темно-синій)
    '#800000',     // 5 (Бордовий)
    '#008080',     // 6 (Бірюзовий)
    '#000000',     // 7 (Чорний)
    '#808080'      // 8 (Сірий)
];

function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = board[r][c];
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;

            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;

            if (tile.revealed) {
                // Розкрита клітинка
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

                if (tile.mine) {
                    // Міна
                    ctx.fillStyle = tile.exploded ? '#FF4D4D' : '#333';
                    ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

                    // Малюємо "міну" (коло)
                    ctx.fillStyle = '#000';
                    ctx.beginPath();
                    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 4, 0, Math.PI * 2);
                    ctx.fill();

                } else if (tile.neighborCount > 0) {
                    // Кількість сусідніх мін
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = TILE_COLORS[tile.neighborCount];
                    ctx.fillText(tile.neighborCount, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
                }

            } else {
                // Нерозкрита клітинка
                ctx.fillStyle = '#D1D1D1';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                // Додавання 3D ефекту
                ctx.fillStyle = '#EFEFEF';
                ctx.fillRect(x, y, TILE_SIZE - 2, 2);
                ctx.fillRect(x, y, 2, TILE_SIZE - 2);
                ctx.fillStyle = '#808080';
                ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
                ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);

                if (tile.flagged) {
                    // Прапорець або неправильний прапорець
                    if (tile.wrongFlag) {
                        // Червоний X на сірому фоні
                        ctx.fillStyle = '#D1D1D1';
                        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = 'red';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(x + 5, y + 5);
                        ctx.lineTo(x + TILE_SIZE - 5, y + TILE_SIZE - 5);
                        ctx.moveTo(x + TILE_SIZE - 5, y + 5);
                        ctx.lineTo(x + 5, y + TILE_SIZE - 5);
                        ctx.stroke();

                    } else {
                        // Звичайний прапорець
                        ctx.fillStyle = 'red';
                        ctx.beginPath();
                        ctx.moveTo(x + TILE_SIZE / 3, y + TILE_SIZE / 4);
                        ctx.lineTo(x + TILE_SIZE / 3, y + TILE_SIZE * 3 / 4);
                        ctx.lineTo(x + TILE_SIZE * 2 / 3, y + TILE_SIZE / 2);
                        ctx.closePath();
                        ctx.fill();

                        ctx.fillStyle = '#333';
                        ctx.fillRect(x + TILE_SIZE / 3, y + TILE_SIZE / 4, 2, TILE_SIZE / 2);
                    }
                }
            }
        }
    }
}