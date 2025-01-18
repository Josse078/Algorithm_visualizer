from flask import Flask, render_template
from flask_socketio import SocketIO
import sys
import traceback
import ast
import inspect
import io
import time

app = Flask(__name__)
socketio = SocketIO(app)

class CodeTracer(ast.NodeTransformer):
    def __init__(self):
        self.step = 0
        
    def visit_Assign(self, node):
        # Track variable assignments
        trace_call = ast.Call(
            func=ast.Name(id='__trace_state__', ctx=ast.Load()),
            args=[ast.Constant(value=self.step)],
            keywords=[]
        )
        self.step += 1
        return [node, ast.Expr(value=trace_call)]
    
    def visit_For(self, node):
        # Track loop iterations
        node.body.insert(0, ast.Expr(value=ast.Call(
            func=ast.Name(id='__trace_state__', ctx=ast.Load()),
            args=[ast.Constant(value=self.step)],
            keywords=[]
        )))
        self.step += 1
        return self.generic_visit(node)
        
    def visit_Call(self, node):
        # Track function calls, especially print statements
        if isinstance(node.func, ast.Name) and node.func.id == 'print':
            return ast.Call(
                func=ast.Name(id='__custom_print__', ctx=ast.Load()),
                args=node.args,
                keywords=node.keywords
            )
        return self.generic_visit(node)
        
    def visit_If(self, node):
        # Track if statements
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

def __custom_print__(*args, **kwargs):
    output = io.StringIO()
    print(*args, file=output, **kwargs)
    content = output.getvalue()
    socketio.emit('print_output', {'content': content})
    output.close()
    print(*args, **kwargs)  # Also print to actual stdout

def __trace_state__(step):
    frame = inspect.currentframe().f_back
    variables = {}
    
    for name, value in frame.f_locals.items():
        if name.startswith('__'):
            continue
            
        try:
            # Enhanced variable representation
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
    time.sleep(0.5)  # Add delay for better visualization

@app.route('/')
def index():
    return render_template('code_visualizer2.html')

@socketio.on('run_code')
def handle_run_code(data):
    code = data.get('code', '')
    
    try:
        # Parse and instrument the code
        tree = ast.parse(code)
        tracer = CodeTracer()
        instrumented_tree = tracer.visit(tree)
        ast.fix_missing_locations(instrumented_tree)
        
        # Compile and execute the instrumented code
        compiled_code = compile(instrumented_tree, '<string>', 'exec')
        global_vars = {
            '__trace_state__': __trace_state__,
            '__custom_print__': __custom_print__,
        }
        
        socketio.emit('clear_visualization')
        exec(compiled_code, global_vars)
        socketio.emit('execution_completed', {'status': 'success'})
        
    except Exception as e:
        error_msg = traceback.format_exc()
        socketio.emit('execution_error', {
            'error': error_msg,
            'line': getattr(e, 'lineno', None)
        })

if __name__ == '__main__':
    socketio.run(app, debug=True)
