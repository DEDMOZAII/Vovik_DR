// static/minesweeper.js

// --- 1. КОНФІГУРАЦІЯ ГРИ ---
const DIFFICULTY_SETTINGS = {
    'medium': { ROWS: 16, COLS: 16, MINES: 40 },
    'hard':   { ROWS: 16, COLS: 30, MINES: 99 }
};
let currentDifficulty = 'hard'; // Початкова складність

const TILE_SIZE = 30; // Розмір клітинки в пікселях

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

    // Обробники подій
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    setupVolumeControl();
    changeDifficulty('hard'); // Встановлюємо початкову складність
};

function changeDifficulty(difficulty) {
    currentDifficulty = difficulty;
    initializeGame();
}

function updateDifficultyButtons() {
    for (const diff in DIFFICULTY_SETTINGS) {
        const button = document.getElementById(`diff-${diff}`);
        if (button) {
            if (diff === currentDifficulty) {
                button.classList.add('difficulty-active');
            } else {
                button.classList.remove('difficulty-active');
            }
        }
    }
}

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
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    const { ROWS, COLS } = settings;

    // Динамічне встановлення розміру canvas
    canvas.width = COLS * TILE_SIZE;
    canvas.height = ROWS * TILE_SIZE;

    updateDifficultyButtons();

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

window.restartGame = () => initializeGame();

// --- 4. ЛОГІКА СТВОРЕННЯ ПОЛЯ (ЗАСИЛЕННЯ ПЕРШОГО КЛІКУ) ---

function createEmptyBoard() {
    const { ROWS, COLS } = DIFFICULTY_SETTINGS[currentDifficulty];
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

function placeMines(firstR, firstC) {
    const { ROWS, COLS, MINES } = DIFFICULTY_SETTINGS[currentDifficulty];
    let mineCount = 0;
    const safeCells = new Set();

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

        if (!board[r][c].mine && !safeCells.has(key)) {
            board[r][c].mine = true;
            mineCount++;
        }
    }
}

function calculateNeighbors() {
    const { ROWS, COLS } = DIFFICULTY_SETTINGS[currentDifficulty];
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
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) {
                        count++;
                    }
                }
            }
            board[r][c].neighborCount = count;
        }
    }
}

// --- 5. ОБРОБНИКИ ПОДІЙ ТА ЛОГІКА КЛІКІВ ---

function getTileCoords(e) {
    const x = e.offsetX;
    const y = e.offsetY;

    const c = Math.floor(x / TILE_SIZE);
    const r = Math.floor(y / TILE_SIZE);
    return { r, c };
}

function handleMouseDown(e) {
    if (!gameActive) return;

    const { ROWS, COLS } = DIFFICULTY_SETTINGS[currentDifficulty];
    const { r, c } = getTileCoords(e);

    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

    if (e.button === 0) { // Лівий клік
        if (!firstClickMade) {
            placeMines(r, c);
            calculateNeighbors();
            startTimer();
            firstClickMade = true;
            revealTile(r, c);
        } else if (board[r][c].revealed) {
            chordReveal(r, c);
        } else {
            revealTile(r, c);
        }
    } else if (e.button === 2) { // Правий клік
        toggleFlag(r, c);
    }

    checkWin();
    drawBoard();
}

function revealTile(r, c) {
    const { ROWS, COLS } = DIFFICULTY_SETTINGS[currentDifficulty];
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

    if (tile.neighborCount === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                revealTile(r + dr, c + dc);
            }
        }
    }
}

function chordReveal(r, c) {
    const { ROWS, COLS } = DIFFICULTY_SETTINGS[currentDifficulty];
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
        for (const neighbor of neighbors) {
            if (!neighbor.tile.flagged && !neighbor.tile.revealed) {
                revealTile(neighbor.r, neighbor.c);
                if (!gameActive) return;
            }
        }
    }
}

function toggleFlag(r, c) {
    const { ROWS, COLS } = DIFFICULTY_SETTINGS[currentDifficulty];
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
    const { ROWS, COLS, MINES } = DIFFICULTY_SETTINGS[currentDifficulty];
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
    if (typeof postTaskCompletion === 'function') {
        postTaskCompletion('minesweeper_cleared');
    }
}

function handleLoss(r, c) {
    gameActive = false;
    clearInterval(timerInterval);
    revealAllMines(true);
    board[r][c].exploded = true;
    if (explosionS) { explosionS.currentTime = 0; explosionS.play().catch(() => { }); }
    drawBoard();
    alert("💣 БУМ! Гру закінчено. Спробуйте ще раз.");
}

function revealAllMines(showMistakes = false) {
    const { ROWS, COLS } = DIFFICULTY_SETTINGS[currentDifficulty];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = board[r][c];
            if (tile.mine) {
                tile.revealed = true;
            } else if (showMistakes && tile.flagged && !tile.mine) {
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
    if (timerEl) {
        timerEl.textContent = `Час: ${timeString}`;
    }
}

// --- 8. РЕНДЕРИНГ НА CANVAS ---

const TILE_COLORS = [
    'transparent', '#0000FF', '#008000', '#FF0000', '#000080', 
    '#800000', '#008080', '#000000', '#808080'
];

function drawBoard() {
    const { ROWS, COLS } = DIFFICULTY_SETTINGS[currentDifficulty];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = board[r][c];
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            if (tile.revealed) {
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                if (tile.mine) {
                    ctx.fillStyle = tile.exploded ? '#FF4D4D' : '#333';
                    ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                    ctx.fillStyle = '#000';
                    ctx.beginPath();
                    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 4, 0, Math.PI * 2);
                    ctx.fill();
                } else if (tile.neighborCount > 0) {
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = TILE_COLORS[tile.neighborCount];
                    ctx.fillText(tile.neighborCount, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
                }
            } else {
                ctx.fillStyle = '#D1D1D1';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#EFEFEF';
                ctx.fillRect(x, y, TILE_SIZE - 2, 2);
                ctx.fillRect(x, y, 2, TILE_SIZE - 2);
                ctx.fillStyle = '#808080';
                ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
                ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
                if (tile.flagged) {
                    if (tile.wrongFlag) {
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