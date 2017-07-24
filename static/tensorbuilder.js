/* constant definition */
const network_layer_scale = 0.6;
const control_unit = 32;
const radio_box_size = 2 * control_unit;
const component_select_size = 3 * control_unit;
const number_input_size = control_unit;
const button_size = control_unit;
const pooling_timeout = 60;
const gap = 2 * control_unit;
const fc_radius = 8;
const minsize = 4;
const default_stride = 4;
const network_depth_ratio = 0.5;
const network_height_ratio = 0.3;

var state = {
    gadgets      : [],
    networklayers: null,
    controllayers: null
};

var image_collection = {
    collection : [],
    push : function(name) {
        for (let j = 0; j < name.length; j ++) {
            let n = name[j];
            let index = -1;
            for (let i = 0; i < this.collection.length; i ++) {
                if (this.collection[i] === n) {
                    index = i;
                    break;
                }
            }
            if (index === -1)
                this.collection.push(n);
        }
    }
}

var component = {
    name       : "Component",
    collection : {},
    __image__  : [],
    set imagename(name) {
        image_collection.push(name);
        this.__image__ = name;
    },
    get imagename() {
        return this.__image__;
    },
    type       : "Type",
    code       : "code",
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
    enable: function (parent) {
        if (parent == null)
            return false;
        else
            return true;
    },
    init : function () {},
    remove : function() {
        if (this.container) {
            remove_children(this.container);
        }
    },
    validate : function(name, parent) { return true; },
    json : function () {
        var data = {};
        data['name'] = this.name;
        data['code'] = this.code;
        return data;
    },
    doc : function () {
        let doc;
        doc = this.type + " " + this.name + "\n";
        for (let i = 0; i < this.input_dim.length; i ++) {
            if (i === 0)
                doc += "Input size: ";
            doc += this.input_dim[i];
            if (i < this.input_dim.length - 1)
                doc += " x ";
            else
                doc += "\n";
        }
        for (let i = 0; i < this.output_dim.length; i ++) {
            if (i === 0)
                doc += "Output size: ";
            doc += this.output_dim[i];
            if (i < this.output_dim.length - 1)
                doc += " x ";
            else
                doc += "\n";
        }
        return doc;
    }
}

function label(doc, container, x, y) {
    let text = new PIXI.Text(doc,
        {fontFamily: 'Arial', fontSize: 16, fill: 0xffffff, align : 'center'});
    text.visible = false;
    let children = container.children;
    let lx = 0, ly = 0;
    for (let i = 0; i < children.length; i ++) {
        let c = children[i];
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
    return text;
}

function remove_children(container) {
    let children = container.children;
    while (container.children.length > 0) {
        container.removeChild(children[0]);
    }
}

var component1D = Object.create(component);
component1D.type = "1D";
component1D.code = "oned";
component1D.imagename = [];
component1D.draw = function (stage, ratio, maxw, maxh) {
    let size = this.output_dim[0];
    let l = Math.floor(Math.log(size)) * 16 + 1;
    let w = Math.floor(fc_radius * 2 * ratio);
    let h = Math.floor(fc_radius * 2 * ratio);

    let x = 0, y = 0;
    this.container = stage;
    stride = 1;
    for (let i = 0; i < l; i ++) {
        let rect = new PIXI.Graphics();
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

var Flatten = Object.create(component1D);
Flatten.validate = function (name, parent) {
    var list = {
        "width":      { valid: false },
        "height":     { valid: false },
        "channel":    { valid: false },
        "stride":     { valid: false },
        "activation": { valid: false },
        "padding":    { valid: false } } ;
    return list[name];
};
Flatten.json = function () {
    var doc = component.json.call(this);
    return doc;
};
Flatten.imagename = ['flatten.png'];
Flatten.type = "Flatten Layer";
Flatten.code = "flatten";
Flatten.init = function(pred, name, property) {
    this.link(pred, name);
    let all = 1;
    for (let i = 0; i < pred.output_dim.length; i ++)
        all *= pred.output_dim[i];
    this.input_dim  = pred.output_dim;
    this.output_dim = [all];
    return this;
}
Flatten.doc = function () {
    let doc = component.doc.call(this);
    return doc;
}

var FullyConnected = Object.create(component1D);
FullyConnected.validate = function (name, parent) {
    var list = {
        "width":      { valid: true, low: 1, high: 9999, decimal: 0, doc: "output cells"},
        "height":     { valid: false },
        "channel":    { valid: false },
        "stride":     { valid: false },
        "activation": { valid: true, doc: "Activation:\nNo(linear)\nSigmoid\nRelu\n" },
        "padding":    { valid: false } } ;
    return list[name];
};
FullyConnected.json = function () {
    var doc = component.json.call(this);
    doc['width'] = this.output_dim[0];
    doc['activation'] = this.activation;
    return doc;
};
FullyConnected.imagename = ['fc.png'];
FullyConnected.type = "Fully Connected Layer";
FullyConnected.code = "fc";
FullyConnected.init = function(pred, name, property) {
    let size = property['width'];
    this.activation = property['activation'] == 0 ? false : true;
    this.link(pred, name);
    let all = 1;
    for (let i = 0; i < pred.output_dim.length; i ++)
        all *= pred.output_dim[i];
    this.input_dim  = [all];
    this.output_dim = [size];
    return this;
}
FullyConnected.doc = function () {
    let doc = component.doc.call(this);
    doc += " *Activation: " + (this.activation ? "ReLU" : "None");
    return doc;
}

var component3D = Object.create(component);
component3D.type = "3D";
component3D.code = "threed";
component3D.imagename = [];
component3D.draw = function(stage, ratio, maxw, maxh) {
    let width    = this.output_dim[0];
    let height   = this.output_dim[1];
    let channels = this.output_dim[2];
    let w = Math.floor(width  * ratio);
    let h = Math.floor(height * ratio);

    this.container = stage;
    w = w < minsize ? minsize : w;
    h = h < minsize ? minsize : h;

    let l = channels < 8 ? channels : Math.floor(Math.log(channels - 8)) * 4 + 8;
    let stride = default_stride;
    let x = 0, y = 0;
    let last_frame = false;
    let i = 0;
    w = Math.floor(w);
    h = Math.floor(h);
    while (last_frame === false) {
        if (i === l - 1)
            last_frame = true;
        let next_x = x + stride, next_y = y + stride;
        if (next_x + w >= maxw || next_y + h >= maxh)
            last_frame = true;
        let g;
        if (last_frame === false) {
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

var LRN = Object.create(component3D);
LRN.validate = function (name, parent) {
    var list = {
        "width":     { valid: true, low: 1, high: 9999, decimal : 3, doc: "bias"}, /* bias         */
        "height":    { valid: true, low: 1, high:    9, decimal : 0, doc: "depth radius"}, /* depth_radius */
        "channel":   { valid: true, low: 1, high: 9999, decimal : 4, doc: "alpha"}, /* alpha        */
        "stride":    { valid: true, low: 1, high:   99, decimal : 2, doc: "beta"}, /* beta         */
        "activation":{ valid: false },
        "padding":   { valid: false } } ;
    return list[name];
};
LRN.json = function () {
    var doc = component.json.call(this);
    doc['width']   = this.bias;
    doc['height']  = this.depth_radius;
    doc['channel'] = this.alpha;
    doc['stride']  = this.beta;
    return doc;
};
LRN.imagename = ['lrn.png'];
LRN.type = "local response normalization";
LRN.code = "lrn";
LRN.init = function(pred, name, property) {
    this.depth_radius = property['height'];
    this.bias         = property['width'];
    this.alpha        = property['channel'];
    this.beta         = property['stride'];
    this.link(pred, name);
    this.input_dim  = pred.output_dim;
    this.output_dim = this.input_dim;
    return this;
}
LRN.doc = function () {
    let doc = component.doc.call(this);
    doc += " depth_radius " + this.depth_radius + "\n";
    doc += " bias " + this.bias + "\n";
    doc += " alpha " + this.alpha + "\n";
    doc += " beta " + this.beta + "\n";
    return doc;
}

var Input = Object.create(component3D);
Input.validate = function (name, parent) {
    var list = {
        "width":      { valid: true, low: 1, high: 9999, decimal : 0, doc: "input width"},
        "height":     { valid: true, low: 1, high: 9999, decimal : 0, doc: "input height"},
        "channel":    { valid: true, low: 1, high: 9999, decimal : 0, doc: "input (color) channels"},
        "stride":     { valid: false },
        "activation": { valid: false },
        "padding":    { valid: false } } ;
    return list[name];
};
Input.enable = function (parent) {
    if (parent == null)
        return true;
    else
        return false;
};
Input.type = "Input Layer";
Input.code = "input";
Input.imagename = ["input.jpg"];
Input.init = function(pred, name, property) {
    let width    = property['width'];
    let height   = property['height'];
    let channels = property['channel'];
    this.link(pred, name);
    this.input_dim = this.output_dim = [width, height, channels];
    return this;
};
Input.json = function () {
    let doc = component.json.call(this);
    doc['width']      = this.input_dim[0];
    doc['height']     = this.input_dim[1];
    doc['channel']    = this.input_dim[2];
    return doc;
};

var Pool2d = Object.create(component3D);
Pool2d.validate = function (name, parent) {
    if (parent == null || parent.output_dim.length < 3) {
        return {valid : false};
    }
    let min = parent.output_dim[0] < parent.output_dim[1] ?
        parent.output_dim[0] : parent.output_dim[1];
    var list = {
        "width":      { valid: true, low: 1, high: parent.output_dim[0], decimal: 0, doc: "kernel width"},
        "height":     { valid: true, low: 1, high: parent.output_dim[1], decimal: 0, doc: "kernel height"},
        "channel":    { valid: false },
        "stride":     { valid: true, low: 1, high: min, decimal: 0, doc: "stride"},
        "activation": { valid: false },
        "padding":    { valid: true, doc: "Padding:same size/ valid only" } };
    return list[name];
};
Pool2d.type = "Pooling Layer";
Pool2d.code = "pool";
Pool2d.imagename = ["pooling.png"];
Pool2d.init = function(pred, name, property) {
    let kernel_width = property['width'];
    let kernel_height = property['height'];
    let stride = property['stride'];
    let padding_same = property['padding'] != 0 ? true : false;
    this.link(pred, name);
    this.kernel_width  = kernel_width;
    this.kernel_height = kernel_height;
    this.stride        = stride;
    this.padding_same  = padding_same;
    this.input_dim     = pred.output_dim;
    let iw = this.input_dim[0];
    let ih = this.input_dim[1];
    let ic = this.input_dim[2];

    let ow = iw;
    let oh = ih;

    if (this.padding_same === false) {
        ow -= this.kernel_width - 1;
        oh -= this.kernel_height - 1;
    }
    ow = Math.floor(ow / stride);
    oh = Math.floor(oh / stride);
    this.output_dim    = [ow, oh, ic];
    return this;
};
Pool2d.doc = function() {
    let doc = component3D.doc.call(this);
    doc += "Kernel: ";
    doc += this.kernel_width + " x " + this.kernel_height + "\n";
    doc += "*Stride: " + this.stride;
    doc += " *Padding: " + (this.padding_same ? "Same" : "Valid");
    return doc;
};
Pool2d.json = function () {
    var doc = component.json.call(this);
    doc['width']      = this.kernel_width;
    doc['height']     = this.kernel_height;
    doc['stride']     = this.stride;
    doc['padding']    = this.padding_same;
    return doc;
};

var Conv2d = Object.create(component3D);
Conv2d.validate = function (name, parent) {
    if (parent == null || parent.output_dim.length < 3) {
        return {valid : false};
    }
    let min = parent.output_dim[0] < parent.output_dim[1] ?
        parent.output_dim[0] : parent.output_dim[1];
    var list = {
        "width":      { valid: true, low: 1, high: parent.output_dim[0], decimal:0, doc: "kernel width" },
        "height":     { valid: true, low: 1, high: parent.output_dim[1], decimal:0, doc: "kernel height" },
        "channel":    { valid: true, low: 1, high: 9999, decimal: 0, doc: "channels" },
        "stride":     { valid: true, low: 1, high: min, decimal: 0, doc: "stride" },
        "activation": { valid: true, doc: "Activation:\nNo(linear)\nSigmoid\nRelu\n" },
        "padding":    { valid: true, doc: "Padding:same size/ valid only" } };
    return list[name];
};
Conv2d.type = "Convolutional Layer";
Conv2d.code = "conv";
Conv2d.imagename = ["convolution.png"];
Conv2d.init = function (pred, name, property) {
    let kernel_width = property['width'];
    let kernel_height = property['height'];
    let channels = property['channel'];
    let stride = property['stride'];
    let padding_same = property['padding'] != 0 ? true : false;
    let activation = property['activation'] == 0 ? false : true;
    this.link(pred, name);
    this.kernel_width  = kernel_width;
    this.kernel_height = kernel_height;
    this.channels      = channels;
    this.stride        = stride;
    this.padding_same  = padding_same;
    this.activation    = activation;
    this.input_dim     = pred.output_dim;
    let iw = this.input_dim[0];
    let ih = this.input_dim[1];
    let ic = this.input_dim[2];

    let ow = iw;
    let oh = ih;

    if (this.padding_same === false) {
        ow -= this.kernel_width - 1;
        oh -= this.kernel_height - 1;
    }
    ow = Math.floor(ow / stride);
    oh = Math.floor(oh / stride);
    this.output_dim    = [ow, oh, this.channels];

    return this;
};
Conv2d.doc = function() {
    let doc = component.doc.call(this);

    doc += "Kernel: ";
    doc += this.kernel_width + " x " + this.kernel_height + " x " + this.channels + "\n";
    doc += "*Stride: " + this.stride;
    doc += " *Padding: " + (this.padding_same ? "Same" : "Valid");
    doc += " *Activation: " + (this.activation ? "ReLU" : "None");
    return doc;
};
Conv2d.json = function () {
    var doc = component.json.call(this);
    doc['width']      = this.kernel_width;
    doc['height']     = this.kernel_height;
    doc['channel']    = this.channels;
    doc['stride']     = this.stride;
    doc['padding']    = this.padding_same;
    doc['activation'] = this.activation;
    return doc;
};

function clear_network(stage) {
    let node = component.collection["input"];
    while (node != null) {
        node.remove();
        node = node.succ;
    }
    remove_children(stage);
}

function draw_network(collection, stage, canvasw, canvash) {
    let nlayers = 0;

    let node = collection["root"];
    while (node != null) {
        nlayers ++;
        node = node.succ;
    }
    if (nlayers == 0)
        return;
    let layerw = Math.floor(canvasw / nlayers), layerh = Math.floor(canvash);

    let max_width = 0, max_height = 0;
    node = collection["root"];
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

    let ratiow, ratioh, ratio;

    ratio = (layerh * network_height_ratio) / max_height;
    layerw = Math.floor(max_width / network_depth_ratio * ratio);

    let x = 0, y = 0;

    let layers = [];

    max_height = 0;

    node = collection["root"];
    while (node != null) {
        let maxw = layerw, maxh = layerh;
        let layer;
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

    for (let i = 0; i < layers.length; i ++) {
        let layer = layers[i];
        layer.y   = max_height - layer.height;
    }

    return (layers);
}

var timer_queue = {
    queue: [],
    add : function(f, o) {
        let q = Object.create(null);
        q.f = f;
        q.o = o;
        this.queue.push(q);
    },
    remove : function(f, o) {
        let index = -1;
        for (let i = 0; i < this.queue.length; i ++) {
            let q = this.queue[i];
            if (q.f === f && q.o === o) {
                index = i;
                break;
            }
        }
        if (index != -1)
            this.queue.splice(index, 1);
    }
}

var ui_images = {
    __image__  : [],
    container  : null,
    docbox     : null,
    set doc(docstring) {
        if (this.docbox == null)
            this.docbox = label(docstring, this.container,
                this.container.x,
                this.container.y + this.container.height);
        else
            this.docbox.text = docstring;
    },
    name : "",
    value : null,
    set imagename(name) {
        image_collection.push(name);
        this.__image__ = name;
    },
    get imagename() {
        return this.__image__;
    },
}

function register_event(obj, par, _start, _end, parameter) {
    let start = function (e) { _start.call(par, e, parameter); }
    let end   = function (e) { _end.call(par, e, parameter); }
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
radio_box.set_validate = function(validate) {
    this.container.visible = validate.valid;
    if (validate.doc != undefined)
        this.doc = validate.doc;
}
radio_box.init = function(stage, def, size) {
    const dark = 0.2, bright = 1.0;
    let start = function(e, p) {
        this.value = p;
        for (let i = 0; i < this.imagename.length; i ++) {
            let pic = this.sprites[i];
            if (i != p)
                pic.alpha = dark;
            else
                pic.alpha = bright;
        }
    }
    let end = function (e, p) { }
    this.value = def;
    this.container = new PIXI.Container();
    this.sprites = [];
    for (let i = 0; i < this.imagename.length; i ++) {
        let name = this.imagename[i];
        let pic = new PIXI.Sprite(PIXI.loader.resources[name].texture);
        pic.alpha = dark;
        if (i === this.value)
            pic.alpha = bright;
        pic.interactive = true;
        register_event(pic, this, start, end, i);
        this.sprites.push(pic);
        pic.width = size;
        pic.height = size;
        pic.x = i * size;
        this.container.addChild(pic);
    }
    this.doc = "";
    stage.addChild(this.container);
}

var select_wheel = Object.create(ui_images);
select_wheel.set_validate = function(validate) { }
select_wheel.components = [];
select_wheel.value_change = null;
select_wheel.set_visible = function(value_no_change) {
    for (let i = 0; i < this.nr_sels; i ++)
        this.images[i].visible = this.value == i;
    if (this.value_change != null && !value_no_change)
        this.value_change(this.components[this.value]);
    this.doc = this.components[this.value].type;
};
select_wheel.set_value = function() {
    for (let j = 0; j < this.nr_sels; j ++)
        if (this.disabled[j] === false) {
            this.value = j;
            break;
        }
}
select_wheel.disable = function(value) {
    let old = this.value;
    for (let i = 0; i < this.components.length; i ++)
        if (value === this.components[i]) {
            this.disabled[i] = true;
            break;
        }
    this.set_value();
    this.set_visible(old === this.value);
};
select_wheel.enable = function(value) {
    let old = this.value;
    for (var i = 0; i < this.components.length; i ++)
        if (value === this.components[i])
            this.disabled[i] = false;
    this.set_value();
    this.set_visible(old === this.value);
};
select_wheel.init = function(parent, size) {
    this.imagename = this.components.reduce(function (sum, x) { return sum.concat(x.imagename); }, ['left.png', 'right.png']);
    this.value = 0;
    this.container = new PIXI.Container();
    this.win = new PIXI.Container();
    this.nr_sels = this.imagename.length - 2;
    this.images = [];
    this.disabled = [];
    for (let i = 2; i < this.imagename.length; i ++) {
        let name = this.imagename[i];
        image = new PIXI.Sprite(PIXI.loader.resources[name].texture);
        image.width = size;
        image.height = size;
        this.disabled.push(false);
        this.win.addChild(image);
        this.images.push(image);
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
    this.doc = "";

    function buttonstart (e, p) {
        let n = 0;
        let old = this.value;
        do {
            this.value += p;
            while (this.value < 0)
                this.value += this.nr_sels;
            this.value = this.value % this.nr_sels;
            n ++;
        } while (this.disabled[this.value] == true && n < this.nr_sels);
        this.set_visible(old === this.value);
    }

    function buttonend (e, p) { }

    register_event(this.leftbutton,  this, buttonstart, buttonend, -1);
    register_event(this.rightbutton, this, buttonstart, buttonend,  1);
}

var number_input = Object.create(ui_images);
number_input.imagename = ['left.png', 'right.png'];
number_input.low_    = 0;
number_input.high_   = 1;
number_input.decimal = 0;
number_input.set_value = function() {
    this.text.text = '' + this.value;
    let width = this.decimal > 0 ? this.width - 1 : this.width;
    this.text.text = ('0'.repeat(width) + this.value).slice(-width);
    if (this.decimal > 0) {
        let str = this.text.text;
        str = str.slice(0, -this.decimal) + "." + str.slice(-this.decimal);
        this.text.text = str;
    }
}
number_input.set_number_format = function(low, high, decimal) {
    if (low >= high)
        return;
    this.low_     = low;
    this.high_    = high;
    this.decimal  = decimal;
    if (this.value >= this.high_ || this.value < this.low_) {
        this.value = this.low_;
    }
}
number_input.set_validate = function(validate) {
    if (validate.valid == false) {
        this.container.visible = false;
    } else {
        this.container.visible = true;
        this.set_number_format(validate.low, validate.high, validate.decimal);
        this.set_value();
        if (validate.doc != undefined)
            this.doc = validate.doc;
    }
}
number_input.init = function(parent, height, width) {
    this.width  = width;
    this.height = height;
    this.container = new PIXI.Container();
    this.fontstyle = new PIXI.TextStyle( {
        fontFamily: "Courier New",
        fontSize:   height,
        fontStyle:  'italic',
        fontWeight: 'bold',
        align:      'right',
        fill:       0xffffff });
    this.value = 0;
    this.text = new PIXI.Text(' '.repeat(this.width), this.fontstyle);
    this.set_value();
    this.timeout = pooling_timeout;
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
        this.value += this.delta;
        this.value = this.value < this.low_ ?  this.low_:
            this.value > this.high_ ? this.high_ : this.value;
        this.set_value();
    }

    function timer() {
        this.timer_value ++;
        if (this.timer_value % this.timeout === 0) {
            settext.call(this);
            this.timeout = this.timeout == 1 ? this.timeout : this.timeout - 1;
            this.delta += this.delta > 0 ? 1 : -1;
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

    this.doc = "";
    parent.addChild(this.container);
}

var buttons = Object.create(ui_images);
buttons.set_validate = function(validate) { }
buttons.imagename = ['plus.jpg', 'minus.jpg', 'ok.jpg'];
buttons.init = function (parent, size) {
    let plusbutton = new PIXI.Sprite(PIXI.loader.resources[this.imagename[0]].texture);
    let minusbutton = new PIXI.Sprite(PIXI.loader.resources[this.imagename[1]].texture);
    let okbutton = new PIXI.Sprite(PIXI.loader.resources[this.imagename[2]].texture);
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

    this.doc = "(+) add one layer\n(-) delete last layer\n(ok) save layer design";

    register_event(plusbutton,  this, buttonstart, buttonend,  1);
    register_event(minusbutton, this, buttonstart, buttonend, -1);
    register_event(okbutton, this, buttonstart, buttonend, 0);

    parent.addChild(this.container);

    function buttonstart (e, p) {
        let change = false;
        if (p === 0) {
            if (create_component() != null) {
                plusbutton.visible = true;
                minusbutton.visible = true;
                okbutton.visible = false;
                for (let k in state.gadgets)
                    if (k !== 'control')
                        state.gadgets[k].container.visible = false;
                change = true;
            }
        } else if (p > 0) {
            let node = component.collection['root'], parent = null;
            while (node) {
                parent = node;
                node = node.succ;
            }
            plusbutton.visible = false;
            minusbutton.visible = false;
            okbutton.visible = true;
            let option = state.gadgets['component'];
            for (let k = 0; k < option.components.length; k ++) {
                let component = option.components[k];
                if (component.enable(parent)) {
                    option.enable(component);
                } else {
                    option.disable(component);
                }
            }
            state.gadgets['component'].container.visible = true;
        } else {
            let node = component.collection['root'], parent = null;
            while (node) {
                parent = node;
                node = node.succ;
            }
            if (parent) {
                node = parent;
                parent = parent.pred;
                node.pred = null;
                if (parent)
                    parent.succ = null;
                else
                    component.collection['root'] = null;
                change = true;
                post_json();
            }
        }
        if (change) {
            let canvasw = window.innerWidth, canvash = window.innerHeight;
            let width = canvasw;
            let height = Math.floor(canvash * network_layer_scale);
            clear_network(state.networklayers);
            draw_network(component.collection, state.networklayers, width, height);
        }
    }

    function buttonend (e, p) {}
}

function post_json() {
    let node = component.collection['root'];
    let body = [];
    while (node) {
        let component_json = node.json();
        body.push(component_json);
        node = node.succ;
    }
    let json = { 'model' : body };
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/model');
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(json));
}

function create_from_json(jsonmodel) {
    let model;
    component.collection['root'] = null;
    try {
        model = JSON.parse(jsonmodel)["model"];
        if (model == null)
            return;
    } catch (e) {
        return;
    }
    let components = state.gadgets['component'].components;
    let parent = null;
    for (let i = 0; i < model.length; i ++) {
        let json = model[i];
        let component_class = null;
        for (let j = 0; j < components.length; j ++) {
            if (components[j].code === json['code']) {
                component_class = components[j];
                break;
            }
        }
        if (component_class === null) {
            component.collection['root'] = null;
            return;
        }
        let new_object = Object.create(component_class);
        if (new_object.init(parent, json['name'], json) != null) {
            if (parent == null)
                component.collection['root'] = new_object;
            parent = new_object;
        }
    }
}

function create_component() {
    let node = component.collection['root'], parent = null;
    let index = 1;
    while (node) {
        parent = node;
        node = node.succ;
        index ++;
    }
    let pairs = {};
    for (let gadget in state.gadgets) {
        let obj = state.gadgets[gadget];
        if (obj.decimal > 0) {
            pairs[obj.name] = obj.value / Math.pow(10, obj.decimal);
        } else
            pairs[obj.name] = obj.value;
    }
    let obj = state.gadgets['component'].components[pairs['component']];

    let comp = Object.create(obj);
    if (comp.init(parent, obj.code + index, pairs) != null) {
        if (parent == null)
            component.collection['root'] = comp;
        post_json();
        return comp;
    }
    return null;
}

function setdrag(stage) {
    let mousex, mousey;
    let data;
    let dragging;

    stage.interactive = true;
    stage.hitArea = new PIXI.Rectangle(stage.x, stage.y, stage.width, stage.height);
    let ondragstart = function(event) {
        data = event.data;
        mousex = data.global.x;
        mousey = data.global.y;
        dragging = true;
    };

    let ondragend = function(event) {
        dragging = false;
        data = null;
    };

    let ondragmove = function(event) {
        if (dragging) {
            let newx = data.global.x;
            let newy = data.global.y;
            let deltax = newx - mousex;
            let deltay = newy - mousey;
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

function component_selected(component) {
    let node = component.collection['root'], parent = null;
    while (node) {
        parent = node;
        node = node.succ;
    }
    for (let k in state.gadgets) {
        let gadget = state.gadgets[k];
        validate = component.validate(k, parent);
        gadget.set_validate(validate);
    }
}

(function() {
    let xml = new XMLHttpRequest();
    let model_desc = {};
    xml.onload = model_loaded;
    xml.open('GET', '/getmodel');
    xml.send();

    function model_loaded() {
        if (xml.readyState == 4 && xml.status == 200)
            model_desc = xml.responseText;
        let rbox1 = Object.create(radio_box);
        rbox1.imagename = ["linear.png", "sigmoid.png", "relu.png"];
        let rbox2 = Object.create(radio_box);
        rbox2.imagename = ["valid.png", "same.png"];
        let component_select = Object.create(select_wheel);
        component_select.components = [Pool2d, Input, FullyConnected, Conv2d, LRN, Flatten];
        component_select.value_change = component_selected;
    
        let renderer = PIXI.autoDetectRenderer();
    
        renderer.view.style.position = "absolute";
        renderer.view.style.display = "block";
        renderer.autoResize = true;
        renderer.resize(window.innerWidth, window.innerHeight);

        document.body.appendChild(renderer.view);
    
        let stage = new PIXI.Container();
    
        renderer.backgroundColor = 0x000000;
    
        PIXI.loader.add(image_collection.collection).load(setup);
    
        function update() {
            requestAnimationFrame(update);

            for (let i = 0; i < timer_queue.queue.length; i ++) {
                let q = timer_queue.queue[i];
                q.f.call(q.o);
            }
    
            renderer.render(stage);
        }
    
        function setup() {
            let canvasw = window.innerWidth, canvash = window.innerHeight;
    
            state.controllayers = new PIXI.Container();
            buttons.init(state.controllayers, button_size);
    
            component_select.init(state.controllayers, component_select_size);
    
            let width_input = Object.create(number_input);
            width_input.init(state.controllayers, number_input_size, 6);
    
            let height_input = Object.create(number_input);
            height_input.init(state.controllayers, number_input_size, 6);
    
            let channel_input = Object.create(number_input);
            channel_input.init(state.controllayers, number_input_size, 6);
    
            let stride_input = Object.create(number_input);
            stride_input.init(state.controllayers, number_input_size, 6);
    
            rbox1.init(state.controllayers, 2, radio_box_size);
    
            rbox2.init(state.controllayers, 0, radio_box_size);
            buttons.name          = "control";
            component_select.name = "component";
            width_input.name      = "width";
            height_input.name     = "height";
            channel_input.name    = "channel";
            stride_input.name     = "stride";
            rbox1.name            = "activation";
            rbox2.name            = "padding";
            state.gadgets = {
                control:          buttons,
                component:        component_select,
                width:            width_input,
                height:           height_input,
                channel:          channel_input,
                stride:           stride_input,
                activation:       rbox1,
                padding:          rbox2,
            };
            let containers = [];
            for (let k in state.gadgets) {containers.push(state.gadgets[k].container);}
    
            let w = 0, h = 0;
            for (let i = 0; i < containers.length; i ++) {
                let gadget = containers[i];
                w += gadget.width + gap;
                if (gadget.height > h)
                    h = gadget.height;
            }
            w += gap;
    
            let width = canvasw, height = Math.floor(canvash * (1.0 - network_layer_scale));
            let ratio = 1.0;
            if (w > width)
                ratio = width / w;
    
            let offset = 0;
            for (let i = 0; i < containers.length; i ++) {
                let gadget = containers[i];
                offset += gap;
                gadget.x = offset;
                gadget.y = Math.floor(h - gadget.height / 2);
                offset += gadget.width;
            }

            stage.addChild(state.controllayers);
            state.controllayers.x = 0;
            state.controllayers.y = height;
            state.controllayers.scale.x = ratio;
            state.controllayers.scale.y = ratio;
            for (let k in state.gadgets)
                if (k !== 'control')
                    state.gadgets[k].container.visible = false;
    
            height = Math.floor(canvash * network_layer_scale);
            create_from_json(model_desc);
            state.networklayers = new PIXI.Container();
            draw_network(component.collection, state.networklayers, width, height);
            stage.addChild(state.networklayers);
            state.networklayers.x = state.networklayers.y = 0;
    
            setdrag(state.networklayers);
    
            renderer.render(stage);
    
            update();
        }
    }
})();

/*
state.network_desc = [
    [ Input,     null, null, "input", 224, 224,  3                ],
    [ Conv2d, "input", null, "conv1_1",  64,  3, 3, 1, true, true ],
    [ Conv2d, "conv1_1", null, "conv1_2",64,  3, 3, 1, true, true ]
];
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
*/
