import ast
import sys
import time
import traceback
import inspect
import cProfile
import pstats
import io
from collections import deque
from flask_socketio import emit

class PerformanceMonitor:
    def __init__(self):
        self.profiler = cProfile.Profile()
        self.start_time = None
        self.stats = {}

    def start(self):
        self.start_time = time.time()
        self.profiler.enable()

    def stop(self):
        self.profiler.disable()
        s = io.StringIO()
        stats = pstats.Stats(self.profiler, stream=s).sort_stats('cumulative')
        stats.print_stats()
        self.stats = {
            'execution_time': time.time() - self.start_time,
            'profile': s.getvalue()
        }
        return self.stats

class BinaryTreeNode:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None

    def to_dict(self):
        return {
            'value': self.value,
            'left': self.left.to_dict() if self.left else None,
            'right': self.right.to_dict() if self.right else None
        }

class DataStructureTracker:
    def __init__(self):
        self.previous_state = None
        self.tracked_vars = set()
        self.animation_step = 0
        self.animation_speed = 0.5

    def set_animation_speed(self, speed):
        self.animation_speed = speed

    def is_visualizable(self, value):
        return (isinstance(value, (list, dict, deque, BinaryTreeNode)) or
                (isinstance(value, tuple) and all(isinstance(x, (int, float, str)) for x in value)) or
                (isinstance(value, list) and all(isinstance(x, list) for x in value)))

    def serialize_value(self, value):
        if isinstance(value, (int, float, str)):
            return value
        elif isinstance(value, deque):
            return {'type': 'queue', 'items': list(value)}
        elif isinstance(value, (list, tuple)):
            if value and all(isinstance(x, list) for x in value):
                return {'type': '2d_array', 'items': value}
            return [self.serialize_value(v) for v in value]
        elif isinstance(value, dict):
            return {str(k): self.serialize_value(v) for k, v in value.items()}
        elif isinstance(value, set):
            return list(value)
        elif isinstance(value, BinaryTreeNode):
            return {'type': 'binary_tree', 'data': value.to_dict()}
        else:
            return str(value)

    def detect_changes(self, local_vars):
        current_state = {}
        visualization_data = []
        for var_name, value in local_vars.items():
            if self.is_visualizable(value):
                serialized = self.serialize_value(value)
                current_state[var_name] = serialized
                self.tracked_vars.add(var_name)

        for var_name in self.tracked_vars:
            if var_name in current_state:
                value = current_state[var_name]
                if isinstance(value, list):
                    visualization_data.append({
                        'type': 'array',
                        'name': var_name,
                        'value': value,
                        'step': self.animation_step,
                        'previous': self.previous_state.get(var_name) if self.previous_state else None
                    })
                elif isinstance(value, dict) and 'type' in value:
                    if value['type'] == 'queue':
                        visualization_data.append({
                            'type': 'queue',
                            'name': var_name,
                            'value': value['items']
                        })
                    elif value['type'] == '2d_array':
                        visualization_data.append({
                            'type': '2d_array',
                            'name': var_name,
                            'value': value['items']
                        })
                    elif value['type'] == 'binary_tree':
                        visualization_data.append({
                            'type': 'binary_tree',
                            'name': var_name,
                            'value': value['data']
                        })
                elif isinstance(value, dict):
                    visualization_data.append({
                        'type': 'graph',
                        'name': var_name,
                        'value': value
                    })
        
        self.previous_state = current_state
        self.animation_step += 1
        return visualization_data

class CodeAnalyzer(ast.NodeTransformer):
    def __init__(self):
        self.loop_depth = 0
        self.has_recursion = False
        self.current_loop = None
        self.current_function = None
        self.loop_count = 0

    def visit_FunctionDef(self, node):
        function_name = node.name
        class RecursionDetector(ast.NodeVisitor):
            def __init__(self, func_name):
                self.func_name = func_name
                self.has_recursion = False
            def visit_Call(self, node):
                if isinstance(node.func, ast.Name) and node.func.id == self.func_name:
                    self.has_recursion = True
                self.generic_visit(node)
        detector = RecursionDetector(function_name)
        detector.visit(node)
        if detector.has_recursion:
            self.has_recursion = True
            node.body.insert(0, self.create_visualization_call())
        return self.generic_visit(node)

    def visit_For(self, node):
        self.loop_count += 1
        loop_id = f"loop_{self.loop_count}"
        enter_loop = ast.Expr(value=ast.Call(
            func=ast.Name(id='__track_loop__', ctx=ast.Load()),
            args=[ast.Constant(value=loop_id), ast.Constant(value='for'), ast.Constant(value=True)],
            keywords=[]
        ))
        exit_loop = ast.Expr(value=ast.Call(
            func=ast.Name(id='__track_loop__', ctx=ast.Load()),
            args=[ast.Constant(value=loop_id), ast.Constant(value='for'), ast.Constant(value=False)],
            keywords=[]
        ))
        node.body.insert(0, enter_loop)
        node.body.append(exit_loop)
        return self.generic_visit(node)

    def visit_While(self, node):
        self.loop_count += 1
        loop_id = f"loop_{self.loop_count}"
        enter_loop = ast.Expr(value=ast.Call(
            func=ast.Name(id='__track_loop__', ctx=ast.Load()),
            args=[ast.Constant(value=loop_id), ast.Constant(value='while'), ast.Constant(value=True)],
            keywords=[]
        ))
        exit_loop = ast.Expr(value=ast.Call(
            func=ast.Name(id='__track_loop__', ctx=ast.Load()),
            args=[ast.Constant(value=loop_id), ast.Constant(value='while'), ast.Constant(value=False)],
            keywords=[]
        ))
        node.body.insert(0, enter_loop)
        node.body.append(exit_loop)
        return self.generic_visit(node)

    def visit_Assign(self, node):
        node = self.generic_visit(node)
        if isinstance(node, ast.Assign):
            return [node, self.create_visualization_call()]
        return node

    def create_visualization_call(self):
        return ast.Expr(
            value=ast.Call(
                func=ast.Name(id='__visualize__', ctx=ast.Load()),
                args=[ast.Call(
                    func=ast.Name(id='locals', ctx=ast.Load()),
                    args=[],
                    keywords=[]
                )],
                keywords=[]
            )
        )

class CodeTracer(ast.NodeTransformer):
    def __init__(self):
        self.step = 0

    def visit_FunctionDef(self, node):
        if self.is_recursive(node):
            enter_call = ast.Expr(value=ast.Call(
                func=ast.Name(id='__trace_recursive_enter__', ctx=ast.Load()),
                args=[ast.Constant(value=node.name), ast.Call(
                    func=ast.Name(id='locals', ctx=ast.Load()),
                    args=[], keywords=[]
                )],
                keywords=[]
            ))
            exit_call = ast.Expr(value=ast.Call(
                func=ast.Name(id='__trace_recursive_exit__', ctx=ast.Load()),
                args=[ast.Constant(value=node.name)],
                keywords=[]
            ))
            node.body.insert(0, enter_call)
            node.body.append(exit_call)
        return self.generic_visit(node)

    def is_recursive(self, node):
        for child in ast.walk(node):
            if isinstance(child, ast.Call) and isinstance(child.func, ast.Name):
                if child.func.id == node.name:
                    return True
        return False

    def visit_Assign(self, node):
        trace_call = ast.Call(
            func=ast.Name(id='__trace_state__', ctx=ast.Load()),
            args=[ast.Constant(value=self.step)],
            keywords=[]
        )
        self.step += 1
        return [node, ast.Expr(value=trace_call)]

    def visit_For(self, node):
        node.body.insert(0, ast.Expr(value=ast.Call(
            func=ast.Name(id='__trace_state__', ctx=ast.Load()),
            args=[ast.Constant(value=self.step)],
            keywords=[]
        )))
        self.step += 1
        return self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name) and node.func.id == 'print':
            return ast.Call(
                func=ast.Name(id='__custom_print__', ctx=ast.Load()),
                args=node.args,
                keywords=node.keywords
            )
        return self.generic_visit(node)

    def visit_If(self, node):
        trace_call = ast.Expr(value=ast.Call(
            func=ast.Name(id='__trace_state__', ctx=ast.Load()),
            args=[ast.Constant(value=self.step)],
            keywords=[]
        ))
        self.step += 1
        node.body.insert(0, trace_call)
        if node.orelse:
            trace_call_else = ast.Expr(value=ast.Call(
                func=ast.Name(id='__trace_state__', ctx=ast.Load()),
                args=[ast.Constant(value=self.step)],
                keywords=[]
            ))
            self.step += 1
            node.orelse.insert(0, trace_call_else)
        return self.generic_visit(node)

def __trace_state__(step, socketio):
    frame = inspect.currentframe().f_back
    variables = {}
    for name, value in frame.f_locals.items():
        if name.startswith('__'):
            continue
        try:
            if isinstance(value, (list, tuple, set)):
                variables[name] = {
                    'type': type(value).__name__,
                    'value': list(value),
                    'length': len(value)
                }
            elif isinstance(value, dict):
                variables[name] = {
                    'type': 'dict',
                    'value': {str(k): str(v) for k, v in value.items()},
                    'length': len(value)
                }
            else:
                variables[name] = {
                    'type': type(value).__name__,
                    'value': repr(value)
                }
        except:
            variables[name] = {
                'type': type(value).__name__,
                'value': '<unprintable>'
            }
    code_context = inspect.getframeinfo(frame)
    socketio.emit('code_step', {
        'step': step,
        'line': code_context.lineno,
        'function': code_context.function,
        'variables': variables,
        'timestamp': time.time()
    })
    tracker = getattr(__visualize__, 'tracker', None)
    time.sleep(tracker.animation_speed if tracker else 0.5)

def __visualize__(local_vars, socketio):
    tracker = getattr(__visualize__, 'tracker', None)
    if tracker is None:
        tracker = DataStructureTracker()
        setattr(__visualize__, 'tracker', tracker)
    visualization_data = tracker.detect_changes(local_vars)
    if visualization_data:
        socketio.emit('update_visualization', {
            'type': 'data_structure',
            'data': visualization_data
        })

def __trace_recursive_enter__(func_name, locals_dict, socketio):
    frame = inspect.currentframe().f_back
    call_info = {
        'function': func_name,
        'args': {k: repr(v) for k, v in locals_dict.items()},
        'line': frame.f_lineno,
        'level': len(inspect.stack()) - 2
    }
    socketio.emit('recursive_call', {
        'type': 'enter',
        'data': call_info,
        'timestamp': time.time()
    })
    tracker = getattr(__visualize__, 'tracker', None)
    time.sleep(tracker.animation_speed if tracker else 0.5)

def __trace_recursive_exit__(func_name, socketio):
    frame = inspect.currentframe().f_back
    call_info = {
        'function': func_name,
        'line': frame.f_lineno,
        'level': len(inspect.stack()) - 2
    }
    socketio.emit('recursive_call', {
        'type': 'exit',
        'data': call_info,
        'timestamp': time.time()
    })
    tracker = getattr(__visualize__, 'tracker', None)
    time.sleep(tracker.animation_speed if tracker else 0.5)

def __custom_print__(*args, socketio, **kwargs):
    output = " ".join(str(arg) for arg in args)
    socketio.emit('print_output', {'content': output})
    print(*args, **kwargs)

def __track_loop__(loop_id, loop_type, is_enter, socketio):
    socketio.emit('loop_update', {
        'id': loop_id,
        'type': loop_type,
        'is_enter': is_enter,
        'line': inspect.currentframe().f_back.f_lineno
    })

def setup_visualization_handlers(socketio):
    @socketio.on('run_code')
    def handle_run_code(data):
        code = data.get('code', '')
        original_stdout = sys.stdout
        monitor = PerformanceMonitor()
        monitor.start()
        
        class OutputCapture:
            def __init__(self):
                self.output = []
            def write(self, msg):
                self.output.append(msg)
                socketio.emit('update_visualization', {
                    'type': 'output',
                    'value': msg.strip()
                })
            def flush(self):
                pass

        output_capture = OutputCapture()
        sys.stdout = output_capture

        try:
            socketio.emit('clear_visualization')
            tree = ast.parse(code)
            analyzer = CodeAnalyzer()
            tracer = CodeTracer()
            
            instrumented_tree = analyzer.visit(tree)
            instrumented_tree = tracer.visit(instrumented_tree)
            ast.fix_missing_locations(instrumented_tree)
            
            compiled_code = compile(instrumented_tree, '<string>', 'exec')
            namespace = {
                '__visualize__': lambda x: __visualize__(x, socketio),
                '__trace_state__': lambda x: __trace_state__(x, socketio),
                '__custom_print__': lambda *a, **kw: __custom_print__(*a, socketio=socketio, **kw),
                '__trace_recursive_enter__': lambda x, y: __trace_recursive_enter__(x, y, socketio),
                '__trace_recursive_exit__': lambda x: __trace_recursive_exit__(x, socketio),
                '__track_loop__': lambda x, y, z: __track_loop__(x, y, z, socketio),
                'time': time,
                'deque': deque
            }
            
            exec(compiled_code, namespace)
            stats = monitor.stop()
            socketio.emit('performance_stats', stats)
            
        except Exception as e:
            error_message = traceback.format_exc()
            socketio.emit('update_visualization', {
                'type': 'error',
                'message': error_message
            })
        finally:
            sys.stdout = original_stdout

    @socketio.on('set_animation_speed')
    def handle_animation_speed(data):
        speed = data.get('speed', 0.5)
        tracker = getattr(__visualize__, 'tracker', None)
        if tracker:
            tracker.set_animation_speed(speed)

def bfs(graph, start_node, socketio):
    visited = set()
    queue = [start_node]
    visited_edges = set()
    while queue:
        node = queue.pop(0)
        if node not in visited:
            visited.add(node)
            __visualize__(locals(), socketio)
            socketio.emit('highlight_visited', {
                'nodes': list(visited),
                'to_visit': queue,
                'edges': list(visited_edges),
                'current': node
            })
            for neighbor in graph.get(node, []):
                if neighbor not in visited and neighbor not in queue:
                    queue.append(neighbor)
                    visited_edges.add(f"{node}-{neighbor}")
    return visited

def dfs(graph, node, socketio, visited=None, path=None, parent=None):
    if visited is None:
        visited = set()
    if path is None:
        path = []
    visited.add(node)
    path.append(node)
    if parent is not None:
        edge = f"{parent}-{node}"
    else:
        edge = None
    __visualize__(locals(), socketio)
    socketio.emit('highlight_visited', {
        'nodes': list(visited),
        'current': node,
        'edges': [f"{path[i-1]}-{path[i]}" for i in range(1, len(path))],
        'to_visit': list(set(graph.get(node, [])) - visited)
    })
    for neighbor in graph.get(node, []):
        if neighbor not in visited:
            dfs(graph, neighbor, socketio, visited, path, node)
    path.pop()
    return visited

def binary_tree_traversal(root, order='inorder', socketio=None):
    def inorder(node):
        if node:
            inorder(node.left)
            __visualize__({'current': node, 'tree': root}, socketio)
            inorder(node.right)

    def preorder(node):
        if node:
            __visualize__({'current': node, 'tree': root}, socketio)
            preorder(node.left)
            preorder(node.right)

    def postorder(node):
        if node:
            postorder(node.left)
            postorder(node.right)
            __visualize__({'current': node, 'tree': root}, socketio)

    if order == 'inorder':
        inorder(root)
    elif order == 'preorder':
        preorder(root)
    else:
        postorder(root)
