
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    mode: "python",
    theme: "monokai",
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    autoCloseBrackets: true,
    matchBrackets: true,
    lineWrapping: true
});

const socket = io();
let visualizationState = new Map();
let executionSteps = [];
let currentStep = -1;
let activeLoops = new Map();
let loopMarkers = new Map();

function loadAlgorithm() {
    const selected = document.getElementById('algorithmSelect').value;
    if (selected && algorithmTemplates[selected]) {
        editor.setValue(algorithmTemplates[selected]);
    }
}

function runCode() {
    activeLoops.forEach(marker => marker.clear());
    activeLoops.clear();
    loopMarkers.clear();
    executionSteps = [];
    currentStep = -1;
    updateExecutionControls();
    document.getElementById('stackFrames').innerHTML = '';
    document.getElementById('output').innerHTML = '';
    document.getElementById('visualization-area').innerHTML = '';
    visualizationState.clear();
    socket.emit('run_code', { code: editor.getValue() });
}

function createArrayVisualization(data, container) {
    const arrayContainer = document.createElement('div');
    arrayContainer.className = 'array-visualization';
    if (data.history && data.history.length > 1) {
        const controls = document.createElement('div');
        controls.className = 'array-controls';
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '←';
        prevBtn.className = 'step-button';
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '→';
        nextBtn.className = 'step-button';
        const stepCounter = document.createElement('span');
        stepCounter.textContent = `Step 1/${data.history.length}`;
        let currentStep = 0;
        
        prevBtn.onclick = () => {
            if (currentStep > 0) {
                currentStep--;
                updateArrayView(data.history[currentStep]);
                stepCounter.textContent = `Step ${currentStep + 1}/${data.history.length}`;
                nextBtn.disabled = false;
                prevBtn.disabled = currentStep === 0;
            }
        };
        
        nextBtn.onclick = () => {
            if (currentStep < data.history.length - 1) {
                currentStep++;
                updateArrayView(data.history[currentStep]);
                stepCounter.textContent = `Step ${currentStep + 1}/${data.history.length}`;
                prevBtn.disabled = false;
                nextBtn.disabled = currentStep === data.history.length - 1;
            }
        };
        
        controls.appendChild(prevBtn);
        controls.appendChild(stepCounter);
        controls.appendChild(nextBtn);
        container.appendChild(controls);
    }

    function updateArrayView(values) {
        arrayContainer.innerHTML = '';
        values.forEach((value, index) => {
            const element = document.createElement('div');
            element.className = 'array-element';
            element.textContent = value;
            const previousValue = visualizationState.get(`${data.name}_${index}`);
            if (previousValue !== undefined && previousValue !== value) {
                element.classList.add('changed');
            }
            arrayContainer.appendChild(element);
            visualizationState.set(`${data.name}_${index}`, value);
        });
    }

    updateArrayView(data.value);
    container.appendChild(arrayContainer);
}

function createGraphVisualization(data, container) {
    const graphContainer = document.createElement('div');
    graphContainer.className = 'graph-visualization';
    container.appendChild(graphContainer);
    
    const width = graphContainer.offsetWidth;
    const height = 300;
    const svg = d3.select(graphContainer)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
        
    const links = [];
    Object.entries(data.value).forEach(([source, targets]) => {
        if (Array.isArray(targets)) {
            targets.forEach(target => {
                links.push({
                    id: `${source}-${target}`,
                    source: source,
                    target: target.toString()
                });
            });
        }
    });

    const nodes = Object.keys(data.value).map(key => ({
        id: key,
        visited: false,
        current: false
    }));

    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('id', d => d.id)
        .style('stroke', '#999')
        .style('stroke-width', 2)
        .attr('marker-end', 'url(#arrowhead)');

    const nodeGroup = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g');

    nodeGroup.append('circle')
        .attr('r', 15)
        .style('fill', '#69b3a2')
        .attr('id', d => `node-${d.id}`);

    nodeGroup.append('text')
        .text(d => d.id)
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .style('fill', 'white')
        .style('font-weight', 'bold');

    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        nodeGroup
            .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
        socket.off('highlight_visited');
    };
}

function createQueueVisualization(data, container) {
    const queueContainer = document.createElement('div');
    queueContainer.className = 'array-visualization';
    data.value.forEach((value, index) => {
        const element = document.createElement('div');
        element.className = 'queue-element';
        element.textContent = value;
        queueContainer.appendChild(element);
    });
    container.appendChild(queueContainer);
}

function create2DArrayVisualization(data, container) {
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid-container';
    data.value.forEach((row, i) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'grid-row';
        row.forEach((cell, j) => {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'grid-cell';
            cellDiv.textContent = cell;
            const previousValue = visualizationState.get(`${data.name}_${i}_${j}`);
            if (previousValue !== undefined && previousValue !== cell) {
                cellDiv.style.backgroundColor = '#ffcdd2';
            }
            visualizationState.set(`${data.name}_${i}_${j}`, cell);
            rowDiv.appendChild(cellDiv);
        });
        gridContainer.appendChild(rowDiv);
    });
    container.appendChild(gridContainer);
}

function createBinaryTreeVisualization(data, container) {
    const treeContainer = document.createElement('div');
    treeContainer.className = 'binary-tree';
    
    function createNode(nodeData, x, y, level) {
        if (!nodeData) return null;
        const node = document.createElement('div');
        node.className = 'tree-node';
        node.style.transform = `translate(${x}px, ${y}px)`;
        const circle = document.createElement('div');
        circle.className = 'node-circle';
        circle.textContent = nodeData.value;
        if (data.current && data.current.value === nodeData.value) {
            circle.classList.add('current');
        }
        node.appendChild(circle);
        return node;
    }

    function renderTree(root, container) {
        const spacing = 60;
        const levelHeight = 80;
        const queue = [{node: root, x: 0, y: 0, level: 0}];
        while (queue.length > 0) {
            const {node, x, y, level} = queue.shift();
            const renderedNode = createNode(node, x, y, level);
            if (renderedNode) {
                container.appendChild(renderedNode);
                if (node.left) {
                    queue.push({
                        node: node.left,
                        x: x - spacing / (level + 1),
                        y: y + levelHeight,
                        level: level + 1
                    });
                }
                if (node.right) {
                    queue.push({
                        node: node.right,
                        x: x + spacing / (level + 1),
                        y: y + levelHeight,
                        level: level + 1
                    });
                }
            }
        }
    }
    renderTree(data.data, treeContainer);
    container.appendChild(treeContainer);
}

function createRecursiveTree() {
    const container = document.createElement('div');
    container.className = 'recursive-tree';
    container.innerHTML = '<h3>Recursion Tree</h3>';
    document.body.appendChild(container);
    return container;
}

function formatArgs(args) {
    return Object.entries(args)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
}

function togglePerformancePanel() {
    const panel = document.getElementById('performancePanel');
    const btn = panel.querySelector('.minimize-button');
    if (panel.classList.toggle('minimized')) {
        btn.textContent = '+';
    } else {
        btn.textContent = '−';
    }
}

function updateExecutionControls() {
    const prevBtn = document.getElementById('prevExecution');
    const nextBtn = document.getElementById('nextExecution');
    const stepDisplay = document.getElementById('executionStep');
    prevBtn.disabled = currentStep <= 0;
    nextBtn.disabled = currentStep >= executionSteps.length - 1;
    stepDisplay.textContent = `Step ${currentStep + 1}/${executionSteps.length}`;
}

function previousExecution() {
    if (currentStep > 0) {
        currentStep--;
        updateExecutionFlow(executionSteps[currentStep]);
        updateExecutionControls();
    }
}

function nextExecution() {
    if (currentStep < executionSteps.length - 1) {
        currentStep++;
        updateExecutionFlow(executionSteps[currentStep]);
        updateExecutionControls();
    }
}

function updateExecutionFlow(data) {
    const diagram = document.getElementById('stackFrames');
    diagram.innerHTML = '';
    const globalFrame = createStackFrame('Global Frame');
    diagram.appendChild(globalFrame);
    
    if (data.variables) {
        for (let [name, info] of Object.entries(data.variables)) {
            if (data.function && data.function !== '<module>') {
                const functionFrame = createStackFrame(data.function);
                const arrow = document.createElement('div');
                arrow.className = 'arrow';
                diagram.appendChild(arrow);
                diagram.appendChild(functionFrame);
                addVariableToFrame(functionFrame, name, info);
            } else {
                addVariableToFrame(globalFrame, name, info);
            }
        }
    }
    
    editor.getAllMarks().forEach(mark => mark.clear());
    const line = data.line - 1;
    const lineContent = editor.getLine(line);
    if (lineContent) {
        editor.markText(
            {line: line, ch: 0},
            {line: line, ch: lineContent.length},
            {className: 'current-line'}
        );
        editor.scrollIntoView({line: line, ch: 0}, 100);
    }
}

function createStackFrame(title) {
    const frame = document.createElement('div');
    frame.className = 'stack-frame';
    frame.style.opacity = '0';
    frame.style.transform = 'translateY(20px)';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'frame-title';
    titleDiv.textContent = title;
    
    const varsDiv = document.createElement('div');
    varsDiv.className = 'frame-variables';
    
    frame.appendChild(titleDiv);
    frame.appendChild(varsDiv);
    
    requestAnimationFrame(() => {
        frame.style.transition = 'all 0.3s ease';
        frame.style.opacity = '1';
        frame.style.transform = 'translateY(0)';
    });
    
    return frame;
}

function addVariableToFrame(frame, name, info) {
    const varsDiv = frame.querySelector('.frame-variables');
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.opacity = '0';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'variable-name';
    nameSpan.textContent = name;
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'variable-value';
    valueSpan.textContent = formatValue(info);
    
    row.appendChild(nameSpan);
    row.appendChild(valueSpan);
    varsDiv.appendChild(row);
    
    requestAnimationFrame(() => {
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '1';
    });
}

function formatValue(info) {
    if (info.type === 'list' || info.type === 'tuple') {
        return `${info.type}[${info.value.join(', ')}]`;
    } else if (info.type === 'dict') {
        const entries = Object.entries(info.value)
            .map(([k, v]) => `${k}: ${v}`).join(', ');
        return `{${entries}}`;
    }
    return info.value;
}

function setSpeed(speed) {
    const slider = document.getElementById('animationSpeed');
    slider.value = speed;
    updateSpeed(speed);
}

function updateSpeed(speed) {
    document.getElementById('speedValue').textContent = speed.toFixed(1) + 's';
    socket.emit('set_animation_speed', { speed });
}

socket.on('performance_stats', function(stats) {
    const panel = document.getElementById('performancePanel');
    panel.style.display = 'block';
    panel.classList.remove('minimized');
    panel.querySelector('.minimize-button').textContent = '−';
    document.getElementById('executionTime').textContent = 
        `Execution Time: ${stats.execution_time.toFixed(3)}s`;
    const profileData = document.getElementById('profileData');
    profileData.innerHTML = `<pre>${stats.profile}</pre>`;
});

socket.on('update_visualization', (data) => {
    if (data.type === 'clear_visualization') {
        visualizationState.clear();
    }
    const container = document.getElementById('visualization-area');
    if (data.type === 'output') {
        const outputDiv = document.getElementById('output');
        outputDiv.textContent += data.value + '\n';
    }
    else if (data.type === 'error') {
        const outputDiv = document.getElementById('output');
        outputDiv.innerHTML += `<span style="color: red">${data.message}</span>\n`;
    }
    else if (data.type === 'data_structure') {
        container.innerHTML = '';
        data.data.forEach((visualData) => {
            const label = document.createElement('div');
            label.textContent = `${visualData.name}:`;
            container.appendChild(label);
            if (visualData.type === 'array') {
                createArrayVisualization(visualData, container);
            } else if (visualData.type === 'graph') {
                createGraphVisualization(visualData, container);
            } else if (visualData.type === 'queue') {
                createQueueVisualization(visualData, container);
            } else if (visualData.type === '2d_array') {
                create2DArrayVisualization(visualData, container);
            } else if (visualData.type === 'binary_tree') {
                createBinaryTreeVisualization(visualData, container);
            }
        });
    }
});

socket.on('code_step', function(data) {
    executionSteps.push(data);
    currentStep = executionSteps.length - 1;
    updateExecutionFlow(data);
    updateExecutionControls();
});

socket.on('recursive_call', function(data) {
    const callInfo = data.data;
    const treeContainer = document.querySelector('.recursive-tree') || createRecursiveTree();
    
    if (data.type === 'enter') {
        const callElement = document.createElement('div');
        callElement.className = 'recursive-call';
        callElement.id = `call-${callInfo.level}-${callInfo.function}`;
        callElement.innerHTML = `
            <div class="recursive-args">
                ${callInfo.function}(${formatArgs(callInfo.args)})
            </div>
        `;
        const parentLevel = callInfo.level - 1;
        const parent = document.querySelector(`#call-${parentLevel}-${callInfo.function}`) 
                    || treeContainer;
        parent.appendChild(callElement);
        requestAnimationFrame(() => {
            callElement.classList.add('active');
        });
    } else if (data.type === 'exit') {
        const callElement = document.querySelector(
            `#call-${callInfo.level}-${callInfo.function}`
        );
        if (callElement) {
            callElement.style.borderColor = '#4CAF50';
        }
    }
});

socket.on('loop_update', function(data) {
    const doc = editor.getDoc();
    if (data.is_enter) {
        const line = data.line - 1;
        const lineText = editor.getLine(line);
        let endLine = line;
        const indent = lineText.match(/^\s*/)[0].length;
        
        for (let i = line + 1; i < doc.lineCount(); i++) {
            const currLine = editor.getLine(i);
            const currIndent = currLine.match(/^\s*/)[0].length;
            if (currIndent === indent) {
                endLine = i;
                break;
            }
        }
        
        const marker = editor.markText(
            {line: line, ch: 0},
            {line: endLine, ch: editor.getLine(endLine).length},
            {
                className: `loop-highlight${activeLoops.size > 0 ? ' nested-highlight' : ''}`,
                css: `opacity: ${1 - activeLoops.size * 0.2}`
            }
        );
        
        activeLoops.set(data.id, marker);
        loopMarkers.set(data.id, {line, endLine});
    } else {
        const marker = activeLoops.get(data.id);
        if (marker) {
            marker.clear();
            activeLoops.delete(data.id);
            loopMarkers.delete(data.id);
        }
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
        previousExecution();
    } else if (e.key === 'ArrowRight') {
        nextExecution();
    }
    
    const slider = document.getElementById('animationSpeed');
    const currentSpeed = parseFloat(slider.value);
    if (e.key === '[') {
        setSpeed(Math.max(0.1, currentSpeed - 0.1));
    } else if (e.key === ']') {
        setSpeed(Math.min(2.0, currentSpeed + 0.1));
    }
});

document.getElementById('animationSpeed').addEventListener('input', function(e) {
    const speed = parseFloat(e.target.value);
    updateSpeed(speed);
});

editor.setValue(algorithmTemplates.example);
