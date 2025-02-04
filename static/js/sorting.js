let array = [];
const numBars = 50;

function generateRandomArray() {
    array = [];
    for (let i = 0; i < numBars; i++) {
        array.push(Math.floor(Math.random() * 100) + 10);
    }
    visualizeArray();
}

function visualizeArray() {
    const arrayContainer = document.getElementById('array');
    arrayContainer.innerHTML = '';
    array.forEach((value) => {
        const bar = document.createElement('div');
        bar.classList.add('bar');
        bar.style.height = `${value * 3}px`;
        arrayContainer.appendChild(bar);
    });
}

function updateBar(index, value) {
    const bar = document.getElementsByClassName('bar')[index];
    bar.style.height = `${value * 3}px`;
}

function isSorted() {
    for (let i = 0; i < array.length - 1; i++) {
        if (array[i] > array[i + 1]) return false;
    }
    return true;
}

async function markSorted() {
    const bars = document.getElementsByClassName('bar');
    for (let i = 0; i < array.length; i++) {
        bars[i].classList.add('sorted');
        await new Promise(resolve => setTimeout(resolve, 20));
    }
}

async function bubbleSort() {
    const bars = document.getElementsByClassName('bar');
    const n = array.length;
    while (!isSorted()) {
        for (let i = 0; i < n - 1; i++) {
            bars[i].classList.add('swapping');
            bars[i + 1].classList.add('swapping');
            await new Promise(resolve => setTimeout(resolve, 50));
            if (array[i] > array[i + 1]) {
                const temp = array[i];
                array[i] = array[i + 1];
                array[i + 1] = temp;
                updateBar(i, array[i]);
                updateBar(i + 1, array[i + 1]);
            }
            bars[i].classList.remove('swapping');
            bars[i + 1].classList.remove('swapping');
        }
    }
    await markSorted();
}

async function selectionSort() {
    const bars = document.getElementsByClassName('bar');
    const n = array.length;
    while (!isSorted()) {
        for (let i = 0; i < n - 1; i++) {
            let minIdx = i;
            bars[i].classList.add('swapping');
            for (let j = i + 1; j < n; j++) {
                bars[j].classList.add('swapping');
                await new Promise(resolve => setTimeout(resolve, 50));
                if (array[j] < array[minIdx]) {
                    minIdx = j;
                }
                bars[j].classList.remove('swapping');
            }
            if (minIdx !== i) {
                const temp = array[i];
                array[i] = array[minIdx];
                array[minIdx] = temp;
                updateBar(i, array[i]);
                updateBar(minIdx, array[minIdx]);
            }
            bars[i].classList.remove('swapping');
            bars[i].classList.add('sorted');
        }
    }
    await markSorted();
}

async function insertionSort() {
    const bars = document.getElementsByClassName('bar');
    const n = array.length;
    while (!isSorted()) {
        for (let i = 1; i < n; i++) {
            let key = array[i];
            let j = i - 1;
            bars[i].classList.add('swapping');
            await new Promise(resolve => setTimeout(resolve, 50));
            while (j >= 0 && array[j] > key) {
                bars[j].classList.add('swapping');
                await new Promise(resolve => setTimeout(resolve, 50));
                array[j + 1] = array[j];
                updateBar(j + 1, array[j + 1]);
                bars[j].classList.remove('swapping');
                j--;
            }
            array[j + 1] = key;
            updateBar(j + 1, key);
            bars[i].classList.remove('swapping');
        }
    }
    await markSorted();
}

async function mergeSort() {
    const bars = document.getElementsByClassName('bar');
    const n = array.length;

    async function mergeSortHelper(array, left, right) {
        if (left < right) {
            const mid = Math.floor((left + right) / 2);
            await mergeSortHelper(array, left, mid);
            await mergeSortHelper(array, mid + 1, right);
            await merge(array, left, mid, right);
        }
    }

    async function merge(array, left, mid, right) {
        const n1 = mid - left + 1;
        const n2 = right - mid;
        const leftArr = new Array(n1);
        const rightArr = new Array(n2);

        for (let i = 0; i < n1; i++) leftArr[i] = array[left + i];
        for (let j = 0; j < n2; j++) rightArr[j] = array[mid + 1 + j];

        let i = 0, j = 0, k = left;
        while (i < n1 && j < n2) {
            bars[k].classList.add('swapping');
            if (k + 1 < bars.length) {
                bars[k + 1].classList.add('swapping');
            }
            await new Promise(resolve => setTimeout(resolve, 50));
            
            if (leftArr[i] <= rightArr[j]) {
                array[k] = leftArr[i];
                updateBar(k, leftArr[i]);
                i++;
            } else {
                array[k] = rightArr[j];
                updateBar(k, rightArr[j]);
                j++;
            }
            
            bars[k].classList.remove('swapping');
            if (k + 1 < bars.length) {
                bars[k + 1].classList.remove('swapping');
            }
            k++;
        }

        while (i < n1) {
            array[k] = leftArr[i];
            updateBar(k, leftArr[i]);
            i++;
            k++;
        }

        while (j < n2) {
            array[k] = rightArr[j];
            updateBar(k, rightArr[j]);
            j++;
            k++;
        }

        for (let i = left; i <= right; i++) {
            if (i < n - 1 && array[i] > array[i + 1]) {
                return false;
            }
            bars[i].classList.add('sorted');
        }
        return true;
    }

    await mergeSortHelper(array, 0, n - 1);
    while (!isSorted()) {
        await mergeSortHelper(array, 0, n - 1);
    }
    
    for (let i = 0; i < n; i++) {
        bars[i].classList.add('sorted');
        await new Promise(resolve => setTimeout(resolve, 20));
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generateArrayBtn').addEventListener('click', generateRandomArray);
    document.getElementById('runBubbleSortBtn').addEventListener('click', bubbleSort);
    document.getElementById('runSelectionSortBtn').addEventListener('click', selectionSort);
    document.getElementById('runInsertionSortBtn').addEventListener('click', insertionSort);
    document.getElementById('runMergeSortBtn').addEventListener('click', mergeSort);
    
    generateRandomArray();
});
