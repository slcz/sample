def model(net):

    net = tf.contrib.layers.conv2d(net, 64, [5,5], 1, activation_fn = tf.nn.relu, padding='SAME', scope='conv2')

    net = tf.contrib.layers.max_pool2d(net, [3, 3], 2, padding='SAME', scope='pool3')

    net = tf.nn.lrn(net, 4, bias = 1.00, alpha = 0.0001, beta = 0.750, name = 'lrn4')

    net = tf.contrib.layers.conv2d(net, 64, [5,5], 1, activation_fn = tf.nn.relu, padding='SAME', scope='conv5')

    net = tf.nn.lrn(net, 4, bias = 1.00, alpha = 0.0001, beta = 0.750, name = 'lrn6')

    net = tf.contrib.layers.max_pool2d(net, [3, 3], 2, padding='SAME', scope='pool7')

    net = tf.contrib.layers.flatten(net, scope='flatten8')
    net = tf.contrib.layers.fully_connected(net, 384, activation_fn=tf.nn.relu, scope='fc9')

    net = tf.contrib.layers.fully_connected(net, 192, activation_fn=tf.nn.relu, scope='fc10')

    net = tf.contrib.layers.fully_connected(net, 10, activation_fn=None, scope='fc11')
    return net
