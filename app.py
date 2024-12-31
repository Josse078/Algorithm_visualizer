import time
import traceback
import sys
from flask_socketio import SocketIO, emit
from flask import Flask, render_template

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/code-visualizer')
def code_visualizer():
    return render_template('code_visualizer.html')

@app.route('/sorting')
def sorting():
    return render_template('sorting_algorithms.html')

@app.route('/pathfinding')
def pathfinding():
    return render_template('pathfinding.html')

@socketio.on('run_code')
def handle_run_code(data):
    code = data.get('code', '')
    class OutputCapture:
        def __init__(self):
            self.output = ""

        def write(self, message):
            self.output += message

    captured_output = OutputCapture()
    sys.stdout = captured_output  

    def run_code_in_background(code):
        try:
            local_vars = {}

            exec(code, {}, local_vars)

            if captured_output.output:
                for line in captured_output.output.splitlines():
                    time.sleep(1)  
                    socketio.emit('update_visualization', {
                        'type': 'output',
                        'value': line 
                    })
            for var, value in local_vars.items():
                if isinstance(value, list):
                    for idx, val in enumerate(value):
                        time.sleep(1) 
                        socketio.emit('update_visualization', {
                            'type': 'array',
                            'values': value, 
                            'index': idx, 
                            'current_value': val 
                        })
                elif isinstance(value, int):
                    time.sleep(1)  
                    socketio.emit('update_visualization', {
                        'type': 'int',
                        'value': value  
                    })
                elif isinstance(value, str):
                    time.sleep(1)
                    socketio.emit('update_visualization', {
                        'type': 'string',
                        'value': value 
                    })
                elif isinstance(value, dict):
                    time.sleep(1)
                    socketio.emit('update_visualization', {
                        'type': 'dict',
                        'values': value  
                    })

        except Exception as e:
            error_message = traceback.format_exc()
            socketio.emit('update_visualization', {'type': 'error', 'message': error_message})

    socketio.start_background_task(run_code_in_background, code)
if __name__ == '__main__':
    socketio.run(app, debug=True)
