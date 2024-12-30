from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')  

@app.route('/sorting')
def sorting():
    return render_template('sorting.html')  

@app.route('/pathfinding')
def pathfinding():
    return render_template('pathfinding.html') 

if __name__ == '__main__':
    app.run(debug=True)
