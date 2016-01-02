var dl = require('datalib'),
    template = dl.template,
    expr = require('vega-expression'),
    args = ['datum', 'event', 'signals'];

var compile = expr.compiler(args, {
  idWhiteList: args,
  fieldVar:    args[0],
  globalVar:   function(id) {
    return 'this.sig[' + dl.str(id) + ']._value';
  },
  functions:   function(codegen) {
    var fn = expr.functions(codegen);
    fn.eventItem  = 'event.vg.getItem';
    fn.eventGroup = 'event.vg.getGroup';
    fn.eventX     = 'event.vg.getX';
    fn.eventY     = 'event.vg.getY';
    fn.scale      = scaleGen(codegen, false);
    fn.iscale     = scaleGen(codegen, true);
    fn.open       = openGen(codegen);
    fn.inrange    = 'this.defs.inrange';
    fn.format     = 'this.defs.format';
    fn.timeFormat = 'this.defs.timeFormat';
    fn.utcFormat  = 'this.defs.utcFormat';
    return fn;
  },
  functionDefs: function(/*codegen*/) {
    return {
      'scale':      scale,
      'inrange':    inrange,
      'format':     numberFormat,
      'timeFormat': timeFormat,
      'utcFormat':  utcFormat,
      'open':       windowOpen
    };
  }
});

function openGen(codegen) {
  return function (args) {
    args = args.map(codegen);
    var n = args.length;
    if (n < 1 || n > 2) {
      throw Error("open takes exactly 1 or 2 arguments.");
    }
    return 'this.defs.open(this.model, ' +
      args[0] + (n > 1 ? ',' + args[1] : '') + ')';
  };
}

function windowOpen(model, url, name) {
  if (window && window.open) {
    var opt = dl.extend({url: url}, model.config().load),
        uri = dl.load.sanitizeUrl(opt);
    if (uri) {
      window.open(uri, name);
    } else {
      throw Error('Invalid URL: ' + opt.url);
    }
  } else {
    throw Error("open can only be invoked in a browser.")
  }
}

function scaleGen(codegen, invert) {
  return function(args) {
    args = args.map(codegen);
    var n = args.length;
    if (n < 2 || n > 3) {
      throw Error("scale takes exactly 2 or 3 arguments.");
    }
    return 'this.defs.scale(this.model, ' + invert + ', ' +
      args[0] + ',' + args[1] + (n > 2 ? ',' + args[2] : '') + ')';
  };
}

function scale(model, invert, name, value, scope) {
  if (!scope || !scope.scale) {
    scope = (scope && scope.mark) ? scope.mark.group : model.scene().items[0];
  }
  // Verify scope is valid
  if (model.group(scope._id) !== scope) {
    throw Error('Scope for scale "'+name+'" is not a valid group item.');
  }
  var s = scope.scale(name);
  return !s ? value : (invert ? s.invert(value) : s(value));
}

function inrange(val, a, b, exclusive) {
  var min = a, max = b;
  if (a > b) { min = b; max = a; }
  return exclusive ?
    (min < val && max > val) :
    (min <= val && max >= val);
}

function numberFormat(specifier, v) {
  return template.format(specifier, 'number')(v);
}

function timeFormat(specifier, d) {
  return template.format(specifier, 'time')(typeof d==='number' ? new Date(d) : d);
}

function utcFormat(specifier, d) {
  return template.format(specifier, 'utc')(typeof d==='number' ? new Date(d) : d);
}

function wrap(model) {
  return function(str) {
    var x = compile(str);
    x.model = model;
    x.sig = model ? model._signals : {};
    return x;
  };
}
wrap.codegen = compile.codegen;
wrap.scale = scale;
module.exports = wrap;
