#!/usr/bin/env python3

from flask import Flask, jsonify, redirect, render_template, request, session, url_for

app = Flask(__name__, static_url_path="", static_folder="static")

@app.route('/')
@app.route('/index')
def index():
    return render_template("index.html")

app.run(debug=True)
