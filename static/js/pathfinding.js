const gridWidth = 30;
const gridHeight = 20;
const grid = [];
let start = null;
let end = null;

function initializeGrid() {
    const gridElement = document.getElementById("grid");
    for (let i = 0; i < gridHeight; i++) {
        const row = [];
        for (let j = 0; j < gridWidth; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener("click", () => handleCellClick(i, j, cell));
            gridElement.appendChild(cell);
            row.push(cell);
        }
        grid.push(row);
    }
}

function handleCellClick(row, col, cell) {
    if (start === null) {
        start = { row, col };
        cell.classList.add("start");
    } else if (end === null && (start.row !== row || start.col !== col)) {
        end = { row, col };
        cell.classList.add("end");
    } else {
        if (!cell.classList.contains("start") && !cell.classList.contains("end")) {
            cell.classList.toggle("wall");
        }
    }
}

function clearGridMarkers() {
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            grid[i][j].classList.remove("visited", "path");
        }
    }
}

async function aStar() {
    await runAlgorithmWithHeuristic(true);
}

async function bfs() {
    await runAlgorithmWithHeuristic(false, true);
}

async function dijkstra() {
    await runAlgorithmWithHeuristic(false);
}

async function runAlgorithmWithHeuristic(useHeuristic = false, isBFS = false) {
    clearGridMarkers();

    if (!start || !end) return;

    const openSet = [];
    const closedSet = [];
    const cameFrom = {};
    const gScores = {};
    const fScores = {};

    openSet.push(start);
    gScores[`${start.row},${start.col}`] = 0;
    fScores[`${start.row},${start.col}`] = useHeuristic ? heuristic(start, end) : 0;

    while (openSet.length > 0) {
        if (!isBFS) {
            openSet.sort((a, b) => fScores[`${a.row},${a.col}`] - fScores[`${b.row},${b.col}`]);
        }

        const current = openSet.shift();
        closedSet.push(current);

        if (current.row === end.row && current.col === end.col) {
            await reconstructPath(cameFrom, current);
            return;
        }

        const neighbors = getNeighbors(current);

        for (const neighbor of neighbors) {
            if (isValidCell(neighbor)) {
                const tentativeG = gScores[`${current.row},${current.col}`] + 1;

                if (closedSet.some(cell => cell.row === neighbor.row && cell.col === neighbor.col)) {
                    continue;
                }

                if (!gScores[`${neighbor.row},${neighbor.col}`] || tentativeG < gScores[`${neighbor.row},${neighbor.col}`]) {
                    cameFrom[`${neighbor.row},${neighbor.col}`] = current;
                    gScores[`${neighbor.row},${neighbor.col}`] = tentativeG;
                    fScores[`${neighbor.row},${neighbor.col}`] = tentativeG + (useHeuristic ? heuristic(neighbor, end) : 0);

                    if (!openSet.some(cell => cell.row === neighbor.row && cell.col === neighbor.col)) {
                        openSet.push(neighbor);
                    }

                    grid[neighbor.row][neighbor.col].classList.add("visited");
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
        }
    }
}

function getNeighbors(cell) {
    return [
        { row: cell.row - 1, col: cell.col },
        { row: cell.row + 1, col: cell.col },
        { row: cell.row, col: cell.col - 1 },
        { row: cell.row, col: cell.col + 1 }
    ];
}

function heuristic(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

async function reconstructPath(cameFrom, current) {
    while (current) {
        grid[current.row][current.col].classList.add("path");
        current = cameFrom[`${current.row},${current.col}`];
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

function isValidCell(cell) {
    return (
        cell.row >= 0 &&
        cell.row < gridHeight &&
        cell.col >= 0 &&
        cell.col < gridWidth &&
        !grid[cell.row][cell.col].classList.contains("wall")
    );
}

document.addEventListener('DOMContentLoaded', function() {
    initializeGrid();
    document.getElementById("runAStarBtn").addEventListener("click", aStar);
    document.getElementById("runBFSBtn").addEventListener("click", bfs);
    document.getElementById("runDijkstraBtn").addEventListener("click", dijkstra);
    document.getElementById("clearGridBtn").addEventListener("click", () => {
        location.reload();
    });
});
