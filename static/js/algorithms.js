const algorithmTemplates = {
    example: `# Example code
from collections import deque
# Create a queue
queue = deque([1, 2, 3, 4, 5])
queue.append(6)
queue.popleft()
# Create a 2D array
grid = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]
grid[1][1] = 0`,

    bfs: `# Breadth-First Search (BFS)
def bfs(graph, start_node):
    visited = set()
    queue = [start_node]
    while queue:
        node = queue.pop(0)
        if node not in visited:
            visited.add(node)
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    queue.append(neighbor)
    return visited

graph = {
    'A': ['B', 'C'],
    'B': ['D', 'E'],
    'C': ['F'],
    'D': [],
    'E': ['F'],
    'F': []
}
start_node = 'A'
result = bfs(graph, start_node)
print("BFS Traversal:", result)`,

    dfs: `# Depth-First Search (DFS)
def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for neighbor in graph.get(node, []):
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
    return visited

graph = {
    'A': ['B', 'C'],
    'B': ['D', 'E'],
    'C': ['F'],
    'D': [],
    'E': ['F'],
    'F': []
}
start_node = 'A'
result = dfs(graph, start_node)
print("DFS Traversal:", result)`,

    bubble: `# Bubble Sort
def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if (arr[j] > arr[j + 1]):
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

arr = [64, 34, 25, 12, 22, 11, 90]
result = bubble_sort(arr)
print("Sorted Array:", result)`,

    insertion: `# Insertion Sort
def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and key < arr[j]:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

arr = [12, 11, 13, 5, 6]
result = insertion_sort(arr)
print("Sorted Array:", result)`,

    binary: `# Binary Search
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

arr = [1, 2, 3, 4, 5, 6, 7, 8, 9]
target = 5
result = binary_search(arr, target)
print(f"Element found at index: {result}" if result != -1 else "Element not found")`,

    fibonacci: `# Fibonacci Sequence (Recursive)
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

n = 10
fib_sequence = [fibonacci(i) for i in range(n)]
print("Fibonacci Sequence:", fib_sequence)`,

    factorial: `# Factorial (Recursive)
def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)

n = 5
result = factorial(n)
print(f"Factorial of {n}:", result)`,

    knapsack: `# 0/1 Knapsack (Tabulation)
def knapsack_tab(weights, values, W, n):
    table = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        for w in range(W + 1):
            if i == 0 or w == 0:
                table[i][w] = 0
            elif weights[i-1] <= w:
                table[i][w] = max(values[i-1] + table[i-1][w-weights[i-1]], 
                                table[i-1][w])
            else:
                table[i][w] = table[i-1][w]
    return table[n][W]

weights = [2, 3, 4, 5]
values = [3, 4, 5, 6]
W = 5  # Weight limit
n = len(weights)
print("Maximum value:", knapsack_tab(weights, values, W, n))`
};
