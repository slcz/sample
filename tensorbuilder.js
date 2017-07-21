
/* constant definition */
const network_layer_scale = 0.6;
const control_unit = 32;
const radio_box_size = 2 * control_unit;
const component_select_size = 3 * control_unit;
const number_input_size = control_unit;
const button_size = control_unit;
const pooling_timeout = 10;
const gap = 2 * control_unit;
const fc_radius = 8;
const minsize = 4;
const default_stride = 4;
const network_depth_ratio = 0.5;
const network_height_ratio = 0.3;

var image_collection = {
    collection : [],
    push : function(name) {
        for (var j = 0; j < name.length; j ++) {
            var n = name[j];
            var index = -1;
            for (var i = 0; i < this.collection.length; i ++) {
                if (this.collection[i] === n) {
                    index = i;
                    break;
                }
            }
            if (index == -1)
                this.collection.push(n);
        }
    }
}

var component = {
    name       : "Component",
    collection:        {},
    __image__  : [],
    set imagename(name) {
        image_collection.push(name);
        this.__image__ = name;
    },
    get imagename() {
        return this.__image__;
    },
    type       : "Type",
    output_dim : [],
    input_dim  : [],
    pred       : null,
    succ       : null,
    link: function(pred, name) {
        this.name      = name;
        this.pred      = pred;
        if (pred != null)
            this.pred.succ = this;
        component.collection[name] = this;
    },
    header : function () {
        var doc;
        doc = this.type + " " + this.name + "\n";
        for (var i = 0; i < this.input_dim.length; i ++) {
            if (i == 0)
                doc += "Input size: ";
            doc += this.input_dim[i];
            if (i < this.input_dim.length - 1)
                doc += " x ";
            else
                doc += "\n";
        }
        for (var i = 0; i < this.output_dim.length; i ++) {
            if (i == 0)
                doc += "Output size: ";
            doc += this.output_dim[i];
            if (i < this.output_dim.length - 1)
                doc += " x ";
            else
                doc += "\n";
        }
        return doc;
    },
    doc : function () {
        return this.header();
    }
}

function label(doc, container, x, y) {
    var text = new PIXI.Text(doc,
        {fontFamily: 'Arial', fontSize: 12, fill: 0xffffff, align : 'center'});
    text.visible = false;
    var children = container.children;
    var lx = 0, ly = 0;
    for (var i = 0; i < children.length; i ++) {
        var c = children[i];
        c.mouseover = function (data) {
            text.visible = true;
        }
        c.mouseout = function (data) {
            text.visible = false;
        }
    }
    text.x = x;
    text.y = y;

    container.addChild(text);
}

var FullyConnected = Object.create(component);
FullyConnected.imagename = ['fc.png'];
FullyConnected.type = "Fully Connected Layer";
FullyConnected.init = function(pred, name, size) {
    this.link(pred, name);
    var all = 1;
    for (var i = 0; i < pred.output_dim.length; i ++)
        all *= pred.output_dim[i];
    this.input_dim  = [all];
    this.output_dim = [size];
}
FullyConnected.draw = function (stage, ratio, maxw, maxh) {
    var size = this.output_dim[0];
    var l = Math.floor(Math.log(size)) * 16 + 1;
    var w = Math.floor(fc_radius * 2 * ratio);
    var h = Math.floor(fc_radius * 2 * ratio);

    stride = 1;
    var x = 0, y = 0;
    for (var i = 0; i < l; i ++) {
        var rect = new PIXI.Graphics();
        rect.beginFill(0x000000);
        rect.lineStyle(1, 0xffffff, 1);
        rect.drawRect(x, y, fc_radius, fc_radius);
        rect.endFill();
        rect.interactive = true;
        rect.hitArea = new PIXI.Rectangle(x, y, fc_radius, fc_radius);
        stage.addChild(rect);
        x += stride;
        y += stride;
        if (x >= maxw || y >= maxh)
            break;
    }
    label(this.doc(), stage, x, y + fc_radius);
}

var component3D = Object.create(component);
component3D.type = "3D";
component3D.imagename = [];
component3D.draw = function(stage, ratio, maxw, maxh) {
    var width    = this.output_dim[0];
    var height   = this.output_dim[1];
    var channels = this.output_dim[2];
    var w = Math.floor(width  * ratio);
    var h = Math.floor(height * ratio);

    w = w < minsize ? minsize : w;
    h = h < minsize ? minsize : h;

    var l = channels < 8 ? channels : Math.floor(Math.log(channels - 8)) * 4 + 8;
    var stride = default_stride;
    var x = 0, y = 0;
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
            g = new PIXI.Sprite(PIXI.loader.resources[this.imagename[0]].texture);
            g.x = x;
            g.y = y;
            g.width = w;
            g.height = h;
        }
        g.interactive = true;
        stage.addChild(g);
        x = next_x;
        y = next_y;
        i = i + 1;
    }
    label(this.doc(), stage, x, y + h);
}

var Input = Object.create(component3D);
Input.type = "Input Layer";
Input.imagename = ["input.jpg"];
Input.init = function(pred, name, width, height, channels) {
    this.link(pred, name);
    this.input_dim = this.output_dim = [width, height, channels];
}

var Pool2d = Object.create(component3D);
Pool2d.type = "Pooling Layer";
Pool2d.imagename = ["pooling.png"];
Pool2d.init = function(pred, name, kernel_width, kernel_height, stride, padding_same) {
    this.link(pred, name);
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
}
Pool2d.doc = function() {
    var doc = this.header();
    doc += "Kernel: ";
    doc += this.kernel_width + " x " + this.kernel_height + "\n";
    doc += "*Stride: " + this.stride;
    doc += " *Padding: " + (this.padding_same ? "Same" : "Valid");
    return doc;
}

var Conv2d = Object.create(component3D);
Conv2d.type = "Convolutional Layer";
Conv2d.imagename = ["convolution.png"];
Conv2d.init = function (pred, name, channels, kernel_width, kernel_height, stride, padding_same, activation) {
    this.link(pred, name);
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
}
Conv2d.doc = function() {
    var doc = this.header();

    doc += "Kernel: ";
    doc += this.kernel_width + " x " + this.kernel_height + " x " + this.channels + "\n";
    doc += "*Stride: " + this.stride;
    doc += " *Padding: " + (this.padding_same ? "Same" : "Valid");
    doc += " *Activation: " + (this.activation ? "ReLU" : "None");
    return doc;
}

function draw_network(stage, desc, canvasw, canvash) {
    for (var i = 0; i < desc.length; i ++) {
        var e     = desc[i];
        var proto = e[0];
        var pred_name = e[1];
        if (pred_name != null)
            e[2] = component.collection[pred_name];
        else
            e[2] = null;
        var obj = Object.create(proto);
        obj.init.apply(obj, e.slice(2, e.length));
    }

    var nlayers = desc.length;
    var layerw = Math.floor(canvasw / nlayers), layerh = Math.floor(canvash);

    var max_width = 0, max_height = 0;
    var node = component.collection["input"];
    while (node != null) {
        if (node.output_dim.length > 1) {
            if (node.output_dim[0] > max_width)
                max_width = node.output_dim[0];
            if (node.output_dim.length > 2)
                if (node.output_dim[1] > max_height)
                    max_height = node.output_dim[1];
        }
        node = node.succ;
    }

    var ratiow, ratioh, ratio;

    ratio = (layerh * network_height_ratio) / max_height;
    layerw = Math.floor(max_width / network_depth_ratio * ratio);

    var x = 0, y = 0;

    var layers = [];

    var max_height = 0;

    var node = component.collection["input"];
    while (node != null) {
        var maxw = layerw, maxh = layerh;
        var layer;
        layer = new PIXI.Container();

        node.draw(layer, ratio, maxw, maxh);
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

function setup() {
    var canvasw = window.innerWidth, canvash = window.innerHeight;
    var networklayers, controllayers;

    var gadgets = [];

    controllayers = new PIXI.Container();
    buttons.init(controllayers, button_size);
    gadgets.push(buttons.container);

    component_select.init(controllayers, component_select_size);
    gadgets.push(component_select.container);

    var width_input = Object.create(number_input);
    width_input.init(controllayers, number_input_size, 0, 0, 9999);
    gadgets.push(width_input.container);

    var height_input = Object.create(number_input);
    height_input.init(controllayers, number_input_size, 0, 0, 9999);
    gadgets.push(height_input.container);

    var channel_input = Object.create(number_input);
    channel_input.init(controllayers, number_input_size, 0, 0, 9999);
    gadgets.push(channel_input.container);

    rbox1.init(controllayers, 2, radio_box_size);
    gadgets.push(rbox1.container);

    rbox2.init(controllayers, 0, radio_box_size);
    gadgets.push(rbox2.container);

    var w = 0, h = 0;
    for (var i = 0; i < gadgets.length; i ++) {
        var gadget = gadgets[i];
        w += gadget.width + gap;
        if (gadget.height > h)
            h = gadget.height;
    }
    w += gap;

    var width = canvasw, height = Math.floor(canvash * (1.0 - network_layer_scale));
    var ratio = 1.0;
    if (w > width)
        ratio = width / w;

    var offset = 0;
    for (var i = 0; i < gadgets.length; i ++) {
        var gadget = gadgets[i];
        offset += gap;
        gadget.x = offset;
        gadget.y = Math.floor(h - gadget.height / 2);
        offset += gadget.width;
    }

    stage.addChild(controllayers);
    controllayers.x = 0;
    controllayers.y = height;
    controllayers.scale.x = ratio;
    controllayers.scale.y = ratio;

    height = canvash * network_layer_scale;
    networklayers = new PIXI.Container();
    layers = draw_network(networklayers, network_desc, width, height);
    stage.addChild(networklayers);
    networklayers.x = networklayers.y = 0;

    setdrag(networklayers);

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

var timer_queue = {
    queue: [],
    add : function(f, o) {
        var q = Object.create(null);
        q.f = f;
        q.o = o;
        this.queue.push(q);
    },
    remove : function(f, o) {
        var index = -1;
        for (var i = 0; i < this.queue.length; i ++) {
            var q = this.queue[i];
            if (q.f == f && q.o == o) {
                index = i;
                break;
            }
        }
        if (index != -1)
            this.queue.splice(index, 1);
    }
}

function update() {
    requestAnimationFrame(update);

    for (var i = 0; i < timer_queue.queue.length; i ++) {
        var q = timer_queue.queue[i];
        q.f.call(q.o);
    }

    renderer.render(stage);
}

var ui_images = {
    __image__  : [],
    set imagename(name) {
        image_collection.push(name);
        this.__image__ = name;
    },
    get imagename() {
        return this.__image__;
    },
}

function register_event(obj, par, _start, _end, parameter) {
    var start = function (e) { _start.call(par, e, parameter); }
    var end   = function (e) { _end.call(par, e, parameter); }
    obj
        .on('mousedown', start)
        .on('touchstart', start)
        .on('mouseup', end)
        .on('mouseupoutside', end)
        .on('touchend', end)
        .on('touchendoutside', end);
    obj.interactive = true;
}

var radio_box = Object.create(ui_images);
radio_box.init = function(stage, def, size) {
    const dark = 0.2, bright = 1.0;
    var start = function(e, p) {
        this.select = p;
        for (var i = 0; i < this.imagename.length; i ++) {
            var pic = this.sprites[i];
            if (i != p)
                pic.alpha = dark;
            else
                pic.alpha = bright;
        }
    }
    var end = function (e, p) { }
    this.select = def;
    this.container = new PIXI.Container();
    this.sprites = [];
    for (var i = 0; i < this.imagename.length; i ++) {
        var name = this.imagename[i];
        var pic = new PIXI.Sprite(PIXI.loader.resources[name].texture);
        pic.alpha = dark;
        if (i == this.select)
            pic.alpha = bright;
        pic.interactive = true;
        register_event(pic, this, start, end, i);
        this.sprites.push(pic);
        pic.width = size;
        pic.height = size;
        pic.x = i * size;
        this.container.addChild(pic);
    }
    stage.addChild(this.container);
}

var select_wheel = Object.create(ui_images);
select_wheel.components = [];
select_wheel.init = function(parent, size) {
    this.imagename = this.components.reduce(function (sum, x) { return sum.concat(x.imagename); }, ['left.png', 'right.png']);
    this.sel = 0;
    this.container = new PIXI.Container();
    this.win = new PIXI.Container();
    this.nr_sels = this.imagename.length - 2;
    this.images = [];
    for (var i = 2; i < this.imagename.length; i ++) {
        var name = this.imagename[i];
        image = new PIXI.Sprite(PIXI.loader.resources[this.imagename[i]].texture);
        image.width = size;
        image.height = size;
        this.win.addChild(image);
        this.images.push(image);
        if (this.sel == i - 2)
            this.visible = true;
        else
            this.visible = true;
    }
    this.win.width = this.win.height = size;

    this.buttonsize = Math.floor(size / 4);
    this.win.x = this.buttonsize;

    this.leftbutton  = new PIXI.Sprite(PIXI.loader.resources[this.imagename[0]].texture);
    this.rightbutton = new PIXI.Sprite(PIXI.loader.resources[this.imagename[1]].texture);
    this.leftbutton.width = this.rightbutton.width = this.leftbutton.height = this.rightbutton.height = this.buttonsize;
    this.leftbutton.x = 0;
    this.rightbutton.x = this.leftbutton.width + this.win.width;
    this.leftbutton.y = this.rightbutton.y = Math.floor((size - this.buttonsize) / 2);

    this.container.addChild(this.leftbutton);
    this.container.addChild(this.rightbutton);
    this.container.addChild(this.win);
    this.container.width = size + 2 * this.buttonsize;
    this.container.height = size;
    parent.addChild(this.container);

    function buttonstart (e, p) {
        this.sel += p;
        if (this.sel < 0)
            this.sel = this.nr_sels - 1;
        if (this.sel >= this.nr_sels)
            this.sel = 0;
        for (var i = 0; i < this.images.length; i ++)
            this.images[i].visible = this.sel == i ? true : false;
    }

    function buttonend (e, p) { }

    register_event(this.leftbutton,  this, buttonstart, buttonend, -1);
    register_event(this.rightbutton, this, buttonstart, buttonend,  1);
}

var number_input = Object.create(ui_images);
number_input.imagename = ['left.png', 'right.png'];
number_input.init = function(parent, height, initial_value, low, high) {
    if (low > high)
        low = high;
    var ndigit = 0;
    var tmp = high;
    while (tmp != 0) {
        ndigit ++;
        tmp = Math.floor(tmp / 10);
    }
    this.low = low;
    this.high = high;
    this.value = initial_value;
    this.ndigit = ndigit;
    this.height = height;
    this.container = new PIXI.Container();
    var fontstyle = new PIXI.TextStyle( {
        fontFamily: "Courier New",
        fontSize:  height,
        fontStyle: 'italic',
        fontWeight: 'bold',
        align: 'right',
        fill: 0xffffff });
    var digits = ('0'.repeat(ndigit) + this.value).slice(-ndigit);
    this.timeout = pooling_timeout;
    this.text = new PIXI.Text(digits, fontstyle);
    this.leftbutton  = new PIXI.Sprite(PIXI.loader.resources[this.imagename[0]].texture);
    this.rightbutton = new PIXI.Sprite(PIXI.loader.resources[this.imagename[1]].texture);
    this.leftbutton.width = this.rightbutton.width = this.leftbutton.height = this.rightbutton.height = height;
    this.leftbutton.x = 0;
    this.rightbutton.x = this.leftbutton.width + this.text.width;
    this.text.x = this.leftbutton.width;
    this.container.addChild(this.leftbutton);
    this.container.addChild(this.text);
    this.container.addChild(this.rightbutton);
    this.delta = 0;

    this.timer_value = 0;

    function settext() {
        var value = Math.floor(this.timer_value / this.timeout);
        this.value += this.delta * value;
        this.value = this.value < this.low ? this.low : this.value > this.high ? this.high : this.value;
        var digits = ('0'.repeat(this.ndigit) + this.value).slice(-this.ndigit);
        this.text.text = digits;
    }

    function timer() {
        this.timer_value ++;
        if (this.timer_value % this.timeout == 0) {
            settext.call(this);
        }
    }

    function buttonstart (e, p) {
        this.timer_value = 0;
        this.timeout = 10;
        this.delta = p;
        timer_queue.add(timer, this);
    }

    function buttonend (e, p) {
        if (this.timer_value % this.timeout != 0) {
            this.timer_value += this.timeout;
            settext.call(this);
        }
        this.timer_value = 0;
        this.delta = p;
        timer_queue.remove(timer, this);
    }

    register_event(this.leftbutton,  this, buttonstart, buttonend, -1);
    register_event(this.rightbutton, this, buttonstart, buttonend,  1);

    parent.addChild(this.container);
}

var buttons = Object.create(ui_images);
buttons.imagename = ['plus.jpg', 'minus.jpg', 'ok.jpg'];
buttons.init = function (parent, size) {
    var plusbutton = new PIXI.Sprite(PIXI.loader.resources[this.imagename[0]].texture);
    var minusbutton = new PIXI.Sprite(PIXI.loader.resources[this.imagename[1]].texture);
    var okbutton = new PIXI.Sprite(PIXI.loader.resources[this.imagename[2]].texture);
    plusbutton.width = plusbutton.height = size;
    minusbutton.width = minusbutton.height = size;
    okbutton.width = okbutton.height = size;
    okbutton.y = 0;
    okbutton.visible = false;
    plusbutton.y  = 0;
    minusbutton.y = size;
    this.container = new PIXI.Container();
    this.container.addChild(plusbutton);
    this.container.addChild(minusbutton);
    this.container.addChild(okbutton);

    plusbutton.interactive = true;
    minusbutton.interactive = true;
    okbutton.interactive = true;

    register_event(plusbutton,  this, buttonstart, buttonend,  1);
    register_event(minusbutton, this, buttonstart, buttonend, -1);
    register_event(okbutton, this, buttonstart, buttonend, 0);

    parent.addChild(this.container);

    function buttonstart (e, p) {
        if (p == 0) {
            plusbutton.visible = true;
            minusbutton.visible = true;
            okbutton.visible = false;
        } else if (p > 0) {
            plusbutton.visible = false;
            minusbutton.visible = false;
            okbutton.visible = true;
        } else {
        }
    }

    function buttonend (e, p) {}
}

var rbox1 = Object.create(radio_box);
rbox1.imagename = ["linear.png", "sigmoid.png", "relu.png"];
var rbox2 = Object.create(radio_box);
rbox2.imagename = ["same.png", "valid.png"];
var component_select = Object.create(select_wheel);
component_select.components = [Pool2d, Input, FullyConnected, Conv2d];

var renderer = PIXI.autoDetectRenderer();

renderer.view.style.position = "absolute";
renderer.view.style.display = "block";
renderer.autoResize = true;
renderer.resize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.view);

var stage = new PIXI.Container();

renderer.backgroundColor = 0x000000;

PIXI.loader.add(image_collection.collection).load(setup);

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
