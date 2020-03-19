'use strict'

const MINE = '💣';
const FLAG = '🚩';
const LIFE = '❤️';
const HINT = '💡';
const SAFE_CLICK = '👍';
var gEmojis = ['😃', '😨', '😭', '😎'];
var gElEmoji = document.querySelector('.emoji');
var gGame;
var gBoard;
var gGameInterval = null;
var gLevels = [
    { idx: 0, SIZE: 4, MINES: 2 },
    { idx: 1, SIZE: 8, MINES: 12 },
    { idx: 2, SIZE: 12, MINES: 30 },
];
var gGameHistory = [];
// gSelectedLevel = Array.from(gLevels[idx]); //Shallow copy
var gSelectedLevel = Object.create(gLevels[1]);
var gRecords = ['---', '---', '---'];
var gBoomAudio = new Audio('audio/boom.mp3');
var gWinAudio = new Audio('audio/win.mp3');
var gFlagAudio = new Audio('audio/flag.wav');
var gLoseAudio = new Audio('audio/lose.mp3');

function init(idx) {
    gElEmoji.innerHTML = gEmojis[0];
    gSelectedLevel = Object.create(gLevels[idx]);
    var elRecord = document.querySelector('.record');
    elRecord.innerText = gRecords[gSelectedLevel.idx];
    gBoard = buildBoard();
    renderBoard(gBoard);
    gGameHistory = [];
    gGame = {
        isOn: true,
        shownCount: 0,
        markedCount: 0,
        isFirstClick: true,
        secsPassed: 0,
        lifesLeft: 3,
        hintsLeft: 3,
        safeClicksLeft: 3,
        isRecord: false
    };
    createHints();
    createLifes();
    createSafeClicks();
    resetTime();
    var elMinesCounter = document.querySelector('.mines-left');
    elMinesCounter.innerHTML = `<span>${gSelectedLevel.MINES}</span>`;
    var dead = document.querySelector('.dead');
    dead.hidden = true;
    var victory = document.querySelector('.victory');
    victory.hidden = true;

}

function buildBoard() {
    var board = [];
    for (var i = 0; i < gSelectedLevel.SIZE; i++) {
        board[i] = [];
        for (var j = 0; j < gSelectedLevel.SIZE; j++) {
            board[i][j] = {
                minesAroundCount: 0,
                isShown: false,
                isMine: false,
                isMarked: false,
                isHinted: false
            }

        }
    }
    return board;
}

function renderBoard(board) {
    var strHTML = '<table><tbody>';
    for (var i = 0; i < board.length; i++) {
        strHTML += '<tr>';
        for (var j = 0; j < board[0].length; j++) {
            var className = `cell cell${i}-${j}`;
            strHTML += `<td class="${className}" 
            onclick="cellClicked(this, gBoard, ${i}, ${j})"
            oncontextmenu="markCell(this, gBoard, ${i}, ${j})">
            </td>`;
        }
        strHTML += '</tr>';
    }
    strHTML += '</tbody></table>';
    var elBoardContainer = document.querySelector('.board-container');
    elBoardContainer.innerHTML = strHTML;
}

function setMinesNegsCount(board) {
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            var minesCount = minesCounter(board, i, j);
            board[i][j].minesAroundCount = minesCount;
        }
    }
}

function minesCounter(board, rowIdx, colIdx) {
    var minesCount = 0;
    for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
        if (i < 0 || i >= board.length) continue;
        for (var j = colIdx - 1; j <= colIdx + 1; j++) {
            if (j < 0 || j >= board[0].length) continue;
            if (i === rowIdx && j === colIdx) continue;
            if (board[i][j].isMine) minesCount++;
        }
    }
    return minesCount++;
}

function spreadMines(board, posI, posJ) {
    var emptyCells = getEmptyCells(board, posI, posJ);
    for (var i = 0; i < gSelectedLevel.MINES; i++) {
        var rndIdx = getRandomIntInclusive(0, emptyCells.length - 1);
        var emptyCell = emptyCells[rndIdx];
        board[emptyCell.i][emptyCell.j].isMine = true;
        emptyCells.splice(rndIdx, 1);
    }
}

function getEmptyCells(board, safeCoordI, safeCoordJ) {
    var emptyCells = [];
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            if (i === safeCoordI && j === safeCoordJ) continue;
            if (!board[i][j].isMine) emptyCells.push({ i: i, j: j });
        }
    }
    return emptyCells;
}

function renderCell(location, value) {
    var elCell = document.querySelector(`.cell${location.i}-${location.j}`);
    elCell.innerHTML = value;
    elCell.classList.add('mine');
}


function cellClicked(elCell, board, i, j) {
    var cell = board[i][j];

    gGame.shownCount++;
    if (!gGame.isOn) return;
    if (cell.isShown) return;
    cell.isShown = true;
    if (cell.isMarked) return;
    console.log('first click', gGame.isFirstClick)
    elCell.classList.add('revealed');
    elCell.innerText = board[i][j].minesAroundCount;
    if (board[i][j].minesAroundCount === 0) {
        elCell.innerText = '';
    }

    colorNums(elCell, cell);


    if (cell.isMine) {
        gGame.shownCount--;
        cell.isShown = true;
        var elMinesCounter = document.querySelector('.mines-left');
        elMinesCounter.innerHTML = --gSelectedLevel.MINES;
        if (gGame.lifesLeft > 1 && !gGame.isWin) {
            setTimeout(function() {
                gElEmoji.innerText = gEmojis[0];
            }, 1000)
        }
        gElEmoji.innerText = gEmojis[1];
        document.querySelector('.life' + (gGame.lifesLeft)).style.display = 'none';
        gGame.lifesLeft--;
        console.log(gGame.lifesLeft);
        if (gGame.lifesLeft === 0) {
            gameOver();
        }
        gBoomAudio.play();
        elCell.innerText = MINE;
        elCell.classList.remove('revealed');
        renderCell({ i: i, j: j }, MINE);
        for (var i = 0; i < board.length; i++) {
            for (var j = 0; j < board[0].length; j++) {
                if (board[i][j].isMine && gGame.lifesLeft === 0) renderCell({ i: i, j: j }, MINE);
            }
        }
    }

    if (gGame.isFirstClick) {
        gGame.secsPassed = 0;
        gGameInterval = setInterval(function() {
            var elTimer = document.querySelector('.timer');
            elTimer.innerHTML = `<span>${gGame.secsPassed++}</span>`;
        }, 1000)
        gGame.isOn = true;
        gGame.isFirstClick = false;
        cell.isShown = true;
        spreadMines(board, i, j);
        setMinesNegsCount(board, i, j);
        expandShown(elCell, board, i, j);
        colorNums(elCell, cell);
    }

    if (!cell.isMine && !cell.isMarked && !cell.minesAroundCount) {
        expandShown(elCell, board, i, j);
    }

    if (gGame.hintOn) {
        giveHint(board, i, j);
        return;
    }

    if (gGame.shownCount ===
        (gSelectedLevel.SIZE ** 2 - gLevels[gSelectedLevel.idx].MINES)) {
        winGame();
    }
    saveGameHistory();
}

function expandShown(elCell, board, i, j) {
    if (!board[i][j].isMine && board[i][j].minesAroundCount > 0) {
        elCell.classList.add('revealed');
        elCell.innerText = board[i][j].minesAroundCount;
        if (!board[i][j].isShown) {
            gGame.shownCount++;
            board[i][j].isShown = true;
        }
        return;
    }
    for (var cellPosI = i - 1; cellPosI <= i + 1; cellPosI++) {
        if (cellPosI < 0 || cellPosI >= board.length) continue;
        for (var cellPosJ = j - 1; cellPosJ <= j + 1; cellPosJ++) {
            if (cellPosJ < 0 || cellPosJ >= board[0].length) continue;

            var cell = board[cellPosI][cellPosJ];
            if (cell.isShown) continue;
            gGame.shownCount++;
            var elCell = document.querySelector(`.cell${cellPosI}-${cellPosJ}`);
            if (cell.minesAroundCount > 0) {
                elCell.innerText = cell.minesAroundCount;
            }
            cell.isShown = true;
            elCell.classList.add('revealed');
            expandShown(elCell, board, cellPosI, cellPosJ);
            colorNums(elCell, cell);
        }
    }
}


function hintClicked(elHint) {
    if (!gGame.isOn) return;
    if (gGame.isFirstClick) return;
    if (!gGame.hintsLeft) return;
    gGame.hintOn = true;
    elHint.style.display = 'none';
}

function giveHint(board, i, j) {
    for (var posI = i - 1; posI <= i + 1; posI++) {
        if (posI < 0 || posI >= board.length) continue;
        for (var posJ = j - 1; posJ <= j + 1; posJ++) {
            if (posJ < 0 || posJ >= board[0].length) continue;
            var cell = board[posI][posJ];
            if (cell.isMarked || cell.isShown) continue;
            cell.isHinted = true;
            if (cell.isMine) renderCell({ i: posI, j: posJ }, MINE);
            else {
                if (!cell.minesAroundCount) cell.minesAroundCount = '';
                else renderCell({ i: posI, j: posJ }, cell.minesAroundCount);
            }
            var elCell = document.querySelector(`.cell${posI}-${posJ}`);
            elCell.classList.add('show-hint');
        }
    }
    gGame.hintsLeft--;
    setTimeout(function() { removeHint(board, i, j) }, 1000);
    gGame.hintOn = false;
}


function removeHint(board, i, j) {
    for (var posI = i - 1; posI <= i + 1; posI++) {
        if (posI < 0 || posI >= board.length) continue;
        for (var posJ = j - 1; posJ <= j + 1; posJ++) {
            if (posJ < 0 || posJ >= board[0].length) continue;
            var cell = board[posI][posJ];
            if (cell.isHinted) {
                cell.isHinted = false;
                renderCell({ i: posI, j: posJ }, '');
                var elCell = document.querySelector(`.cell${posI}-${posJ}`);
                elCell.classList.remove('show-hint');
                elCell.classList.remove('mine');
            }
        }
    }
}

function markCell(elCell, gBoard, i, j) {

    var currCell = gBoard[i][j];
    if (!currCell.isMarked && !currCell.isShown && gGame.isOn) {
        gFlagAudio.play();
        gGame.markedCount++;
        currCell.isMarked = true;
        elCell.innerText = FLAG;
        gSelectedLevel.MINES--;
        var elMinesCounter = document.querySelector('.mines-left');
        elMinesCounter.innerHTML = `<span>${gSelectedLevel.MINES}</span>`;


    } else {
        if (currCell.isMine) return;
        if (currCell.isShown) return;
        gGame.markedCount--;
        currCell.isMarked = false;
        elCell.innerText = '';
        var elMinesCounter = document.querySelector('.mines-left');
        elMinesCounter.innerHTML = `<span>${++gSelectedLevel.MINES}</span>`
        renderCell({ i: i, j: j }, '');
        elCell.classList.remove('mine');
    }
    saveGameHistory();
}

function safeClickClicked(elSafeClick) {
    if (!gGame.isOn) return;
    if (!gGame.isOn || !gGame.safeClicksLeft) return;
    if (gGame.isFirstClick) return;
    gGame.safeClicksLeft--;
    safeClick(gBoard);
    elSafeClick.style.display = 'none';
}

function safeClick(board) {
    var safeCells = [];
    for (var i = 0; i < board.length; i++) {
        for (var j = 1; j < board[0].length; j++) {
            if (!board[i][j].isMine && !board[i][j].isMarked && !board[i][j].isShown) {
                safeCells.push({ i: i, j: j, minesAroundCount: board[i][j].minesAroundCount });
            }
        }
    }
    var rndIdx = getRandomIntInclusive(0, safeCells.length - 1);
    var rndSafeCell = safeCells[rndIdx];
    var elSafeCell = document.querySelector(`.cell${rndSafeCell.i}-${rndSafeCell.j}`);
    renderCell(rndSafeCell, SAFE_CLICK);

    elSafeCell.classList.add('safe-click-clicked');
    elSafeCell.classList.remove('mine');
    setTimeout(function() {
        renderCell(rndSafeCell, '');
        elSafeCell.classList.remove('mine');
        elSafeCell.classList.remove('safe-click-clicked');

        expandShown(elSafeCell, board, rndSafeCell.i, rndSafeCell.j);
        colorNums(elSafeCell, rndSafeCell);

    }, 1000);
}

function undoMoves() {
    if (!gGame.isOn) return;

    if (gGameHistory.length > 1) {
        gGameHistory.pop();
        var lastMove = gGameHistory[gGameHistory.length - 1];
        if (gGame.lifesLeft != lastMove.gGame.lifesLeft) createLifes();
        gBoard = lastMove.gBoard;
        gGame = lastMove.gGame;
    } else {
        init(gSelectedLevel.idx);
        return;
    }
    renderBoard(gBoard);
}

function saveGameHistory() {
    var newBoard = [];
    for (var i = 0; i < gBoard.length; i++) {
        newBoard[i] = [];
        for (var j = 0; j < gBoard[0].length; j++) {
            var cell = gBoard[i][j];
            var newCell = {
                minesAroundCount: cell.minesAroundCount,
                isShown: cell.isShown,
                isMine: cell.isMine,
                isMarked: cell.isMarked,
                i: cell[i],
                j: cell[j]
            }
            newBoard[i].push(newCell);
        }
    }
    var gGameNew = {
        isOn: gGame.isOn,
        shownCount: gGame.shownCount,
        markedCount: gGame.markedCount,
        isFirstClick: gGame.isFirstClick,
        secsPassed: gGame.secsPassed,
        lifesLeft: gGame.lifesLeft,
        hintsLeft: gGame.hintsLeft,
        safeClicksLeft: gGame.safeClicksLeft,
        isRecord: gGame.isRecord
    }
    gGameHistory.push({ gBoard: newBoard, gGame: gGameNew });
}

function setRecord(lvlIdx) {
    if (gGame.secsPassed < localStorage[lvlIdx]) {
        var elRecord = document.querySelector('.record');
        gGame.isRecord = true;
        localStorage[lvlIdx] = gGame.secsPassed;
        gRecords[lvlIdx] = gGame.secsPassed;
        elRecord.innerText = gGame.secsPassed;
    }
    return;
}

function gameOver() {
    gLoseAudio.play();
    clearInterval(gGameInterval);
    gGame.isOn = false;
    var dead = document.querySelector('.dead');
    dead.hidden = false;
    gElEmoji.innerHTML = gEmojis[2];
    console.log('DEAD')
}

function winGame() {

    gGame.isWin = true;
    gGame.isOn = false;
    clearInterval(gGameInterval);
    gGameInterval = null;
    gElEmoji.innerHTML = gEmojis[3];
    gWinAudio.play();
    setRecord(gSelectedLevel.idx);
    var victory = document.querySelector('.victory');
    victory.hidden = false;

}