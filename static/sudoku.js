// static/sudoku.js

const SudokuGame = (function () {
    const ROWS = 9, COLS = 9;
    let grid = [];
    let initialGrid = [];
    let selectedCell = null;
    let noteMode = false;

    // --- АУДІО ЕЛЕМЕНТИ ---
    const bgm = document.getElementById('bgm');
    const clickS = document.getElementById('click');
    const errorS = document.getElementById('error');
    const winS = document.getElementById('win');
    const hintS = document.getElementById('hint');
    const noteS = document.getElementById('note');
    const eraseS = document.getElementById('erase');
    const volumeSlider = document.getElementById('volumeSlider');


    // --- 1. ЛОГІКА КЕРУВАННЯ ЗВУКОМ ---
    function applyVolumeToSE(volume) {
        const seVolume = volume * 0.7;
        if (clickS) clickS.volume = seVolume;
        if (errorS) errorS.volume = seVolume;
        if (winS) winS.volume = seVolume;
        if (hintS) hintS.volume = seVolume;
        if (noteS) noteS.volume = seVolume * 0.5;
        if (eraseS) eraseS.volume = seVolume;
    }

    if (volumeSlider) {
        const initialVolume = parseFloat(volumeSlider.value);
        if (bgm) bgm.volume = initialVolume;
        applyVolumeToSE(initialVolume);

        volumeSlider.addEventListener('input', (event) => {
            const newVolume = parseFloat(event.target.value);
            if (bgm) bgm.volume = newVolume;
            applyVolumeToSE(newVolume);

            const volumeIcon = document.querySelector('.volume-control i');
            if (volumeIcon) {
                if (newVolume === 0) volumeIcon.className = 'fas fa-volume-mute';
                else if (newVolume < 0.3) volumeIcon.className = 'fas fa-volume-down';
                else volumeIcon.className = 'fas fa-volume-up';
            }
        });
    }

    document.body.addEventListener('click', () => {
        if (bgm && bgm.paused) {
            bgm.play().catch(e => console.log("BGM auto-play blocked:", e));
        }
    }, { once: true });


    // --- 2. ЛОГІКА ГЕНЕРАЦІЇ ТА РОЗВ'ЯЗАННЯ ---

    function generateSudoku(difficulty) {
        let solution = Array(9).fill(0).map(() => Array(9).fill(0));
        solveSudoku(solution); // Створення повністю розв'язаного поля

        let cellsToRemove;
        switch (difficulty) {
            case 'easy': cellsToRemove = 30; break;
            case 'medium': cellsToRemove = 40; break;
            case 'hard': cellsToRemove = 50; break;
            default: cellsToRemove = 40;
        }

        let puzzle = solution.map(row => row.slice());
        let attempts = cellsToRemove;

        // Видалення клітинок
        while (attempts > 0) {
            let r = Math.floor(Math.random() * 9);
            let c = Math.floor(Math.random() * 9);

            if (puzzle[r][c] !== 0) {
                puzzle[r][c] = 0;
                attempts--;
            }
        }

        // Ініціалізація ігрової сітки
        grid = puzzle.map((row) =>
            row.map((val) => ({
                value: val,
                notes: new Set(),
                initial: val !== 0
            }))
        );
        initialGrid = solution.map(row => row.slice()); // Зберігаємо рішення

        selectedCell = null;
        return grid;
    }

    // Алгоритм зворотної трасування для розв'язання/генерації
    function solveSudoku(board) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) {
                    const numbers = Array.from({ length: 9 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
                    for (const num of numbers) {
                        if (isSafe(board, r, c, num)) {
                            board[r][c] = num;
                            if (solveSudoku(board)) {
                                return true;
                            }
                            board[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    function isSafe(board, r, c, num) {
        for (let i = 0; i < 9; i++) {
            if (board[r][i] === num || board[i][c] === num) return false;
        }
        let startRow = r - r % 3, startCol = c - c % 3;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (board[row + startRow][col + startCol] === num) return false;
            }
        }
        return true;
    }


    // --- 3. РЕНДЕРИНГ ТА ВЗАЄМОДІЯ З UI ---

    function renderGrid() {
        const gridElement = document.getElementById('sudoku-grid');
        gridElement.innerHTML = '';

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const cellData = grid[r][c];

                if (cellData.initial) {
                    cell.classList.add('initial');
                    cell.textContent = cellData.value;
                } else if (cellData.value !== 0) {
                    cell.textContent = cellData.value;
                } else if (cellData.notes.size > 0) {
                    // Рендеринг нотаток
                    const notesDiv = document.createElement('div');
                    notesDiv.className = 'notes';
                    for (let i = 1; i <= 9; i++) {
                        const note = document.createElement('div');
                        note.textContent = cellData.notes.has(i) ? i : '';
                        notesDiv.appendChild(note);
                    }
                    cell.appendChild(notesDiv);
                }

                cell.addEventListener('click', () => selectCell(r, c));
                gridElement.appendChild(cell);
            }
        }
        updateUI();
    }

    function selectCell(r, c) {
        if (selectedCell) {
            selectedCell.element.classList.remove('selected');
        }

        const cellElement = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        cellElement.classList.add('selected');
        selectedCell = { r, c, element: cellElement };

        updateUI();
        if (clickS) { clickS.currentTime = 0; clickS.play().catch(() => { }); }
    }

    function updateUI() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('highlighted', 'error');
        });

        if (selectedCell) {
            const { r: sr, c: sc } = selectedCell;

            // Підсвічування рядка, стовпця та блоку
            document.querySelectorAll('.cell').forEach(cell => {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);

                const isSameBlock = (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3));
                if (r === sr || c === sc || isSameBlock) {
                    cell.classList.add('highlighted');
                }
            });

            checkErrors(); // Перевірка помилок на всьому полі
        }

        // Оновлення стилю кнопки нотаток
        const noteButton = document.querySelector('.small-button i.fa-pencil-alt').parentElement;
        noteButton.classList.toggle('note-mode-active-button', noteMode);
    }

    // --- 4. ІГРОВА ЛОГІКА ТА КЕРУВАННЯ ВВОДОМ ---

    function handleNumberInput(number) {
        if (!selectedCell) return;
        const { r, c } = selectedCell;
        const cellData = grid[r][c];

        if (cellData.initial) {
            if (errorS) { errorS.currentTime = 0; errorS.play().catch(() => { }); }
            return;
        }

        let soundToPlay = null;
        let didChange = false;

        if (noteMode) {
            // Режим нотаток
            if (cellData.value !== 0) cellData.value = 0; // Очистити основне значення

            if (number === 0) { // Стерти всі нотатки
                if (cellData.notes.size > 0) {
                    cellData.notes.clear();
                    soundToPlay = eraseS;
                    didChange = true;
                }
            } else {
                // Додати/видалити нотатку
                if (cellData.notes.has(number)) {
                    cellData.notes.delete(number);
                    soundToPlay = eraseS;
                } else {
                    cellData.notes.add(number);
                    soundToPlay = noteS;
                }
                didChange = true;
            }
        } else {
            // Режим основного вводу
            cellData.notes.clear();

            if (number === 0 || cellData.value === number) {
                // Стирання (0 або подвійний клік на тому ж числі)
                if (cellData.value !== 0) {
                    cellData.value = 0;
                    soundToPlay = eraseS;
                    didChange = true;
                }
            } else {
                // Введення нового числа
                cellData.value = number;
                didChange = true;
                if (!checkConflict(r, c, number, true)) {
                    soundToPlay = errorS;
                } else {
                    soundToPlay = clickS;
                }
            }
        }

        if (didChange && soundToPlay) { soundToPlay.currentTime = 0; soundToPlay.play().catch(() => { }); }

        renderGrid();
        checkWin();
    }

    function toggleNoteMode() {
        noteMode = !noteMode;
        if (noteS) { noteS.currentTime = 0; noteS.play().catch(() => { }); }
        updateUI();
    }

    function checkConflict(r, c, val, currentCellOnly = false) {
        if (val === 0) return true;

        // Перевірка рядка та стовпця
        for (let i = 0; i < 9; i++) {
            if (i !== c && grid[r][i].value === val) return false;
            if (i !== r && grid[i][c].value === val) return false;
        }

        // Перевірка блоку 3x3
        let startRow = r - r % 3, startCol = c - c % 3;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                let currR = row + startRow, currC = col + startCol;
                if ((currR !== r || currC !== c) && grid[currR][currC].value === val) return false;
            }
        }

        return true;
    }

    function checkErrors() {
        document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('error'));

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const val = grid[r][c].value;
                if (val !== 0 && !checkConflict(r, c, val, false)) {
                    const cellEl = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    if (cellEl) {
                        cellEl.classList.add('error');
                    }
                }
            }
        }
    }


    function checkWin() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                // 1. Перевірка на заповненість
                if (grid[r][c].value === 0) {
                    return false;
                }
                // 2. Перевірка на конфлікти
                if (!checkConflict(r, c, grid[r][c].value, false)) {
                    return false;
                }
            }
        }

        // Якщо все заповнено і немає конфліктів - ПЕРЕМОГА
        winS.play().catch(() => { });
        alert("🎉 Вітаємо! Ви розв'язали Судоку!");

        // Виклик функції Flask
        if (typeof postTaskCompletion === 'function') {
            postTaskCompletion('sudoku_solved');
        }

        return true;
    }


    function setupInputListeners() {
        // Обробник для панелі цифр
        document.querySelectorAll('#number-panel .num-button').forEach(button => {
            button.onclick = (e) => {
                const text = e.target.textContent.trim();
                let number;

                if (e.target.id === 'erase-button' || e.target.closest('#erase-button')) {
                    number = 0;
                } else if (text.match(/^\d$/)) {
                    number = parseInt(text);
                } else {
                    return;
                }

                handleNumberInput(number);
            };
        });

        // Обробник для клавіатури
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') {
                handleNumberInput(parseInt(e.key));
            } else if (e.key === 'Delete' || e.key === 'Backspace' || e.key === '0') {
                handleNumberInput(0);
            } else if (e.key === 'n' || e.key === 'N') {
                toggleNoteMode();
            }
        });
    }

    function useHint() {
        if (!selectedCell) return alert("Оберіть клітинку для підказки.");

        const { r, c } = selectedCell;

        if (grid[r][c].initial) return alert("Ця клітинка вже фіксована.");

        const correctValue = initialGrid[r][c];

        if (grid[r][c].value === correctValue) return alert("Клітинка вже заповнена правильно!");

        grid[r][c].value = correctValue;
        grid[r][c].notes.clear();

        if (hintS) { hintS.currentTime = 0; hintS.play().catch(() => { }); }
        renderGrid();
        checkWin();
    }


    function startGame(difficulty = 'medium') {
        generateSudoku(difficulty);
        renderGrid();
        setupInputListeners();
        console.log(`Судоку розпочато. Складність: ${difficulty}`);
    }

    return {
        startGame: startGame,
        restartGame: startGame,
        toggleNoteMode: toggleNoteMode,
        useHint: useHint
    };

})();

window.onload = () => {
    window.sudoku = SudokuGame;
    SudokuGame.startGame('medium');
};