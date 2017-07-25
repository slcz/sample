def model(net):

    net = tf.contrib.layers.conv2d(net, 64, [5,5], [1, 1], activation_fn = tf.nn.relu, padding='SAME', scope='conv2')

    net = tf.contrib.layers.max_pool2d(net, [3, 3], [2, 2], padding='SAME', scope='pool3')
