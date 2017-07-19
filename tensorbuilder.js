var renderer = PIXI.autoDetectRenderer();

renderer.view.style.position = "absolute";
renderer.view.style.display = "block";
renderer.autoResize = true;
renderer.resize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.view);

var stage = new PIXI.Container();

renderer.backgroundColor = 0x000000;

function fully_connected_doc() {
    var doc;

    doc = "Fully Connected Layer " + this.name + "\n";
    doc += "Input size: " + this.input_dim[2] + "\n";
    doc += "Output size: " + this.output_dim[2];

    return doc;
}

function fully_connected_draw(stage, ratio, maxw, maxh) {
    var size = this.output_dim[2];
    var radius = 4;
    var w = Math.floor(radius * 2 * ratio);
    var h = Math.floor(radius * 2 * ratio);
    var text = new PIXI.Text(this.doc(),
        {fontFamily: 'Arial', fontSize: 12, fill: 0xffffff, align : 'center'});

    text.visible = false;

    stride = 1;
    var x = 0, y = 0;
    var lx, ly;
    for (var i = 0; i < size; i ++) {
        var circle = new PIXI.Graphics();
        circle.beginFill(0x000000);
        circle.lineStyle(1, 0xffffff, 1);
        circle.drawRect(x, y, radius, radius);
        circle.endFill();
        stage.addChild(circle);
        circle.interactive = true;
        circle.hitArea = new PIXI.Rectangle(x, y, radius, radius);
        x += stride;
        y += stride;
        lx = x;
        ly = y + Math.floor(h);
        circle.mouseover = function (data) {
            text.visible = true;
        }
        circle.mouseout = function (data) {
            text.visible = false;
        }
        if (x >= maxw || y >= maxh)
            break;
    }
    text.x = lx;
    text.y = ly;
    stage.addChild(text);
}

function FullyConnected(pred, name, size) {
    this.name = name;
    this.pred = pred;
    this.pred.succ     = this;
    var all = 1;
    for (var i = 0; i < pred.output_dim.length; i ++)
        all *= pred.output_dim[i];
    this.input_dim  = [1, 1, all];
    this.output_dim = [1, 1, size];
    this.draw = fully_connected_draw;
    this.doc  = fully_connected_doc;
    this.succ = undefined;

    return this;
}

function input_doc() {
    var doc = "";

    doc = "Input Layer " + this.name + ":\n"
    doc += "Dimension: ";
    doc += this.input_dim[0] + " x " + this.input_dim[1] + " x " + this.input_dim[2] + "\n";
    return doc;
}

function Input(pred, name, width, height, channels) {
    this.name  = name;
    this.pred  = null;
    this.input_dim = this.output_dim = [width, height, channels];

    this.draw = threeDdraw;
    this.doc  = input_doc;

    return this;
}

Input.prototype.imagename = ["input.jpg"];

function Pool2d(pred, name, kernel_width, kernel_height, stride, padding_same) {
    this.name          = name;
    this.pred          = pred;
    this.pred.succ     = this;
    this.kernel_width  = kernel_width;
    this.kernel_height = kernel_height;
    this.stride        = stride;
    this.padding_same  = padding_same;
    this.input_dim     = pred.output_dim;
    var iw = this.input_dim[0];
    var ih = this.input_dim[1];
    var ic = this.input_dim[2];

    var ow = iw;
    var oh = ih;

    if (this.padding_same == false) {
        ow -= this.kernel_width - 1;
        oh -= this.kernel_height - 1;
    }
    ow = Math.floor(ow / stride);
    oh = Math.floor(oh / stride);
    this.output_dim    = [ow, oh, ic];
    this.draw          = threeDdraw;
    this.doc           = pool2d_doc;
    this.succ          = undefined;

    return this;
}

Pool2d.prototype.imagename = ["pooling.png"];

function pool2d_doc() {
    var doc = "";

    doc = "Pooling Layer " + this.name + ":\n"
    doc += "Input: ";
    doc += this.input_dim[0] + " x " + this.input_dim[1] + " x " + this.input_dim[2] + "\n";
    doc += "Output: ";
    doc += this.output_dim[0] + " x " + this.output_dim[1] + " x " + this.output_dim[2] + "\n";
    doc += "Kernel: ";
    doc += this.kernel_width + " x " + this.kernel_height + "\n";
    doc += "*Stride: " + this.stride;
    doc += " *Padding: " + (this.padding_same ? "Same" : "Valid");
    return doc;
}

function loadtexture(name, width, height, size, gap) {
    var textures = [];

    var texture = PIXI.utils.TextureCache[name];

    for (var i = 0; i < width; i ++) {
        for (var j = 0; j < height; j ++) {
            var sub = new PIXI.Texture(texture, new PIXI.Rectangle(i * (size + gap), j * (size + gap), size, size));
            textures.push(sub);
        }
    }
    return textures;
}

function Conv2d(pred, name, channels, kernel_width, kernel_height, stride, padding_same, activation) {
    this.name          = name;
    this.pred          = pred;
    this.pred.succ     = this;
    this.kernel_width  = kernel_width;
    this.kernel_height = kernel_height;
    this.channels      = channels;
    this.stride        = stride;
    this.padding_same  = padding_same;
    this.activation    = activation;
    this.input_dim     = pred.output_dim;
    var iw = this.input_dim[0];
    var ih = this.input_dim[1];
    var ic = this.input_dim[2];

    var ow = iw;
    var oh = ih;

    if (this.padding_same == false) {
        ow -= this.kernel_width - 1;
        oh -= this.kernel_height - 1;
    }
    ow = Math.floor(ow / stride);
    oh = Math.floor(oh / stride);
    this.output_dim    = [ow, oh, this.channels];
    this.draw          = threeDdraw;
    this.doc           = conv2d_doc;
    this.succ          = undefined;

    return this;
}

Conv2d.prototype.imagename = ["convolution.png"];

function conv2d_doc() {
    var doc = "";

    doc = "Convolutional Layer " + this.name + ":\n"
    doc += "Input: ";
    doc += this.input_dim[0] + " x " + this.input_dim[1] + " x " + this.input_dim[2] + "\n";
    doc += "Output: ";
    doc += this.output_dim[0] + " x " + this.output_dim[1] + " x " + this.output_dim[2] + "\n";
    doc += "Kernel: ";
    doc += this.kernel_width + " x " + this.kernel_height + " x " + this.channels + "\n";
    doc += "*Stride: " + this.stride;
    doc += " *Padding: " + (this.padding_same ? "Same" : "Valid");
    doc += " *Activation: " + (this.activation ? "ReLU" : "None");
    return doc;
}

function threeDdraw(stage, ratio, maxw, maxh) {
    var width    = this.output_dim[0];
    var height   = this.output_dim[1];
    var channels = this.output_dim[2];
    var w = Math.floor(width  * ratio);
    var h = Math.floor(height * ratio);

    var text = new PIXI.Text(this.doc(),
        {fontFamily: 'Arial', fontSize: 12, fill: 0xffffff, align : 'center'});

    w = w < 4 ? 4 : w;
    h = h < 4 ? 4 : h;

    var stride = Math.floor((maxw - w) / channels);
    if (stride <= 1)
        stride = 2;
    if (stride > w / 2)
        stride = Math.floor(w / 2)
    var x = 0, y = 0;
    var lx, ly, l = (channels > 32 ? 32 : channels);
    text.visible = false;
    var last_frame = false;
    var i = 0;
    w = Math.floor(w);
    h = Math.floor(h);
    while (last_frame == false) {
        if (i == l - 1)
            last_frame = true;
        var next_x = x + stride, next_y = y + stride;
        if (next_x + w >= maxw || next_y + h >= maxh)
            last_frame = true;
        var g;
        if (last_frame == false) {
            g = new PIXI.Graphics();
            g.beginFill(0x808080);
            g.lineStyle(1, 0xFFFFFF, 1);
            g.drawRect(x, y, w, h);
            g.endFill();
            g.hitArea = new PIXI.Rectangle(x, y, w, h);
        } else {
            g = new PIXI.Sprite(PIXI.loader.resources[this.imagename].texture);
            g.x = x;
            g.y = y;
            g.width = w;
            g.height = h;
        }
        g.interactive = true;
        stage.addChild(g);
        x = next_x;
        y = next_y;
        lx = x;
        ly = y + h;
        g.mouseover = function (data) {
            text.visible = true;
        }
        g.mouseout = function (data) {
            text.visible = false;
        }
    }
    text.x = lx;
    text.y = ly;
    stage.addChild(text);
}

var network_desc = [
    [ Input,     null, null, "input", 224, 224,  3                ],
    [ Conv2d, "input", null, "conv1_1",  64,  3, 3, 1, true, true ],
    [ Conv2d, "conv1_1", null, "conv1_2",64,  3, 3, 1, true, true ],
    [ Pool2d, "conv1_2", null, "pool1", 2, 2, 2, true],

    [ Conv2d, "pool1",   null, "conv2_1", 128, 3, 3, 1, true, true ],
    [ Conv2d, "conv2_1", null, "conv2_2", 128, 3, 3, 1, true, true ],
    [ Pool2d, "conv2_2", null, "pool2", 2, 2, 2, true],

    [ Conv2d, "pool2",   null, "conv3_1", 256, 3, 3, 1, true, true ],
    [ Conv2d, "conv3_1", null, "conv3_2", 256, 3, 3, 1, true, true ],
    [ Conv2d, "conv3_2", null, "conv3_3", 256, 3, 3, 1, true, true ],
    [ Pool2d, "conv3_3", null, "pool3", 2, 2, 2, true],

    [ Conv2d, "pool3",   null, "conv4_1", 512, 3, 3, 1, true, true ],
    [ Conv2d, "conv4_1", null, "conv4_2", 512, 3, 3, 1, true, true ],
    [ Conv2d, "conv4_2", null, "conv4_3", 512, 3, 3, 1, true, true ],
    [ Pool2d, "conv4_3", null, "pool4", 2, 2, 2, true],

    [ Conv2d, "pool4",   null, "conv5_1", 512, 3, 3, 1, true, true ],
    [ Conv2d, "conv5_1", null, "conv5_2", 512, 3, 3, 1, true, true ],
    [ Conv2d, "conv5_2", null, "conv5_3", 512, 3, 3, 1, true, true ],
    [ Pool2d, "conv5_3", null, "pool5", 2, 2, 2, true],

    [ FullyConnected, "pool5", null, "FC1", 4096],
    [ FullyConnected, "FC1",   null, "FC2", 4096],
    [ FullyConnected, "FC2",   null, "FC3", 1000]
];

const buttonwidth = 20;

function draw_network(stage, desc) {
    var network = {};
    var canvasw = window.innerWidth, canvash = window.innerHeight;

    for (var i = 0; i < desc.length; i ++) {
        var e = desc[i];
        var constructor = e[0];
        var pred_name = e[1];
        if (pred_name != null)
            e[2] = network[pred_name];
        else
            e[2] = null;
        var obj = Object.create(constructor.prototype);
        var elem = constructor.apply(obj, e.slice(2, e.length));
        network[elem.name] = elem;
    }

    var nlayers = desc.length;
    var layerw = Math.floor(canvasw / nlayers), layerh = Math.floor(canvash);

    var max_width = 0, max_height = 0;
    var node = network["input"];
    while (node != undefined) {
        if (node.output_dim[0] > max_width)
            max_width = node.output_dim[0];
        if (node.output_dim.length >= 2)
            h = node.output_dim[1];
        else
            h = 1;
        if (h > max_height)
            max_height = h;
        node = node.succ;
    }

    var ratiow, ratioh, ratio;

    ratio = (layerh * 0.3) / max_height;
    layerw = Math.floor(max_width / 0.8 * ratio);

    var x = 0, y = 0;

    var layers = [];

    var max_height = 0;

    var node = network["input"];
    while (node != undefined) {
        var maxw = layerw * 0.9, maxh = layerh * 0.9;
        var layer;
        layer = new PIXI.Container();

        node.draw(layer, ratio, Math.floor(layerw * 0.9), Math.floor(layerh * 0.9));
        layer.x = x;
        layer.y = y;
        stage.addChild(layer);
        x += layerw;
        if (layer.y + layer.height >= max_height)
            max_height = layer.y + layer.height;

        layers.push(layer);
        node = node.succ;
    }

    for (var i = 0; i < layers.length; i ++) {
        var layer = layers[i];
        layer.y   = max_height - layer.height;
    }

    return (layers);
}

var components = [Input, Conv2d, Pool2d];
PIXI.loader.add(components.map(function(x) {
    return x.prototype.imagename;
})).load(setup);

function setup() {

    var networklayers;

    networklayers = new PIXI.Container();
    layers = draw_network(networklayers, network_desc);
    stage.addChild(networklayers);
    setdrag(networklayers);
    networklayers.x = 0;

    renderer.render(stage);

    update();
}

function setdrag(stage) {
    var mousex, mousey;
    var data;
    var dragging;

    stage.interactive = true;
    stage.hitArea = new PIXI.Rectangle(stage.x, stage.y, stage.width, stage.height);
    var ondragstart = function(event) {
        data = event.data;
        mousex = data.global.x;
        mousey = data.global.y;
        dragging = true;
    };

    var ondragend = function(event) {
        dragging = false;
        data = null;
    };

    var ondragmove = function(event) {
        if (dragging) {
            var newx = data.global.x;
            var newy = data.global.y;
            var deltax = newx - mousex;
            var deltay = newy - mousey;
            mousex = newx;
            mousey = newy;
            stage.x = stage.x + deltax;
            stage.y = stage.y + deltay;
        }
    };

    stage
        .on('mousedown', ondragstart)
        .on('touchstart', ondragstart)
        .on('mouseup', ondragend)
        .on('mouseupoutside', ondragend)
        .on('touchend', ondragend)
        .on('touchendoutside', ondragend)
        .on('mousemove', ondragmove)
        .on('touchmove', ondragmove);
}

function update() {
    renderer.render(stage);
    requestAnimationFrame(update);
}
