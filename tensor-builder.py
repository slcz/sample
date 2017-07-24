#!/usr/bin/env python3
import uuid
import json
import os

from flask import Flask, jsonify, redirect, render_template, request, session, url_for

app = Flask(__name__, static_url_path="", static_folder="static")

@app.route('/')
@app.route('/index.html')
def index():
    user = request.args.get('user')
    session["user"] = user
    return render_template("index.html")

@app.route('/getuid', methods=['GET'])
def getuid():
    return jsonify({"uid": session["user"]})

@app.route('/getmodel', methods=['GET'])
def getmodel_request():
    uid = session["user"]
    model = {}
    try:
        with open(os.path.join('model', str(uid)), 'r') as modelfile:
            try:
                model = json.load(modelfile)
            except JSONDecodeError:
                model = {}
    except EnvironmentError:
        model = {}
    return jsonify(model)

@app.route('/model', methods=['POST'])
def model_request():
    uid = session["user"]
    content = request.json
    with open(os.path.join('model', str(uid)), 'w') as modelfile:
        json.dump(content, modelfile)
        generate_tensorflow_model(content, uid)
    return jsonify({"code": "success"})

def flatten_block(f, last, block):
    f.write("""
    net = tf.contrib.layers.flatten(net, scope='{}')""".format(block['name']))

def lrn_block(f, last, block):
    f.write("""
    net = tf.nn.lrn(net, {}, bias = {:.2f}, alpha = {:.3f}/9.0, beta = {:.3f}, name = '{}')\n""".format(block['height'], block['width'] / 1000.0, block['channel'] / 10000.0, block['stride'] / 100.0, block['name']))

def input_block(f, last, block):
    f.write('def model(net):\n')

def fc_block(f, last, block):
    if block['activation'] == True:
        activation = 'tf.nn.relu'
    else:
        activation = 'None'
    f.write("""
    net = tf.contrib.layers.fully_connected(net, {}, activation_fn={}, scope='{}')\n""".format(block['width'], activation, block['name']))

def pool2d_block(f, last, block):
    if block['padding'] == True:
        padding = 'SAME'
    else:
        padding = 'VALID'
    f.write("""
    net = tf.contrib.layers.max_pool2d(net, [{}, {}], {}, padding='{}', scope='{}')\n"""
    .format(block['width'], block['height'], block['stride'], padding, block['name']))

def conv2d_block(f, last, block):
    if block['padding'] == True:
        padding = 'SAME'
    else:
        padding = 'VALID'
    if block['activation'] == True:
        activation = 'tf.nn.relu'
    else:
        activation = 'None'
    f.write("""
    net = tf.contrib.layers.conv2d(net, {}, [{},{}], {}, activation_fn = {}, padding='{}', scope='{}')\n"""
    .format(block['channel'], block['width'], block['height'], block['stride'], activation, padding, block["name"]))

def generate_tensorflow_model(content, uid):
    block_table = {
        "flatten": flatten_block,
        "lrn":     lrn_block,
        "input":   input_block,
        "conv":    conv2d_block,
        "pool":    pool2d_block,
        "fc":      fc_block }
    last = None
    with open(os.path.join('model', str(uid) + '.py'), 'w') as tensorflow:
        for block in content['model']:
            block_table[block["code"]](tensorflow, last, block)
            last = block
        tensorflow.write('    return net\n')

app.secret_key = 'jcizybHUbu0s8&h16ba8sd;;'
app.run(debug=True, host = "0.0.0.0", port=8080)
