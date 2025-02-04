from flask import Flask, render_template
from flask_socketio import SocketIO
from code_visualizer import setup_visualization_handlers

app = Flask(__name__)
socketio = SocketIO(app)

setup_visualization_handlers(socketio)

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

if __name__ == '__main__':
    socketio.run(app, debug=True)