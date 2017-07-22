#!/usr/bin/env python3
import uuid
import json
import os

from flask import Flask, jsonify, redirect, render_template, request, session, url_for

app = Flask(__name__, static_url_path="", static_folder="static")

@app.route('/')
@app.route('/index')
def index():
    return render_template("index.html")

@app.route('/getmodel', methods=['GET'])
def getmodel():
    model = {}
    if 'uid' in session:
        uid = session['uid']
        with open(os.path.join('model', str(uid)), 'r') as modelfile:
            model = json.load(modelfile)
    return jsonify(model)

@app.route('/model', methods=['POST'])
def model():
    if 'uid' in session:
        uid = session['uid']
    else:
        uid = uuid.uuid4()
        session['uid'] = uid
    content = request.json
    with open(os.path.join('model', str(uid)), 'w') as modelfile:
        json.dump(content, modelfile)
    return jsonify({"code": "success"})

app.secret_key = 'jcizybHUbu0s8&h16ba8sd;;'

app.run(debug=True, host = "0.0.0.0", port=8080)
