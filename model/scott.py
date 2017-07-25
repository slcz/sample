def model(net):

    net = tf.nn.lrn(net, 9, bias = 0.10, alpha = 0.010, beta = 0.990, name = 'lrn2')
    return net
