var SimplEE = (typeof window !== 'undefined') ?
  window.SimplEE || {} :
  exports;

(function(exports) {
  var slice = Array.prototype.slice;

  var EventEmitter = function() {
    this._listeners = {};
    this._onceListeners = {};
  };

  EventEmitter.prototype.on = function(name, fn) {
    this._listeners[name] = this._listeners[name] || [];
    this._listeners[name].push(fn);
    this.emit("newListener", name, fn);
    return this;
  };

  EventEmitter.prototype.once = function (name, fn) {
    this._onceListeners[name] = this._onceListeners[name] || [];
    this._onceListeners[name].push(fn);
    this.emit("newListener", name, fn);
    return this;
  };

  EventEmitter.prototype.remove = function(name, fn) {
    fn && this._listeners[name] && this._listeners[name].splice(this._listeners[name].indexOf(fn), 1);
    fn && this._onceListeners[name] && this._onceListeners[name].splice(this._onceListeners[name].indexOf(fn), 1);
    this.emit("removeListener", name, fn);
  };

  EventEmitter.prototype.emit = function(name) {
    var listeners = this._listeners[name] || [];
    var onceListeners = this._onceListeners[name] || [];
    var args = slice.call(arguments, 1);
    for(var i = 0, len = listeners.length; i < len; ++i) {
      try {
        listeners[i].apply(this, args);
      } catch(err) {
        this.emit('error', err);
      }
    }
    for(var i = onceListeners.length - 1; i >= 0; i--) {
      try {
        onceListeners[i].apply(this, args);
      } catch(err) {
        this.emit('error', err);
      }
      this.remove(name, onceListeners[i]);
    }
  };

  EventEmitter.prototype.emits = function(name, fn) {
    var ee = this;
    return function() {
      var args = slice.call(arguments),
          result = fn.apply(this, args),
          emit = result instanceof Array ? result : [result];

      // destructuring emit
      ee.emit.apply(ee, [name].concat(emit));
      return result;
    };
  };

  exports.EventEmitter = EventEmitter;
  exports.global = new EventEmitter();
  exports.emits = function() {
    return exports.global.emits.apply(exports.global, slice.call(arguments));
  };
})(SimplEE);
