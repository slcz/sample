import tensorflow as tf
import numpy as np
def model(net):

    net = tf.contrib.layers.conv2d(net, 91, [3,2], [1, 1], activation_fn = tf.nn.relu, padding='VALID', scope='conv2')

    net = tf.contrib.layers.max_pool2d(net, [4, 4], [2, 2], padding='VALID', scope='pool3')

    net = tf.contrib.layers.flatten(net)

    net = tf.contrib.layers.fully_connected(net, 254, activation=tf.nn.relu, scope='fc4')
    return net
