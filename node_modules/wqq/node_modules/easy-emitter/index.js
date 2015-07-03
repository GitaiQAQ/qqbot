;(function(){

  function Emitter(){
    if (typeof this._handlers !== 'undefined') {
      throw new Error('namespace conflict')
    }
    this._handlers = {}

    if (typeof this.emit !== 'function') { // auto apply prototype
      for (var k in Emitter.prototype) {
        this[k] = Emitter.prototype[k]
      }
    }
  }

  Emitter.prototype.on = function(key, fn){
    if (!this._handlers[key]) {
      this._handlers[key] = []
    }
    this._handlers[key].push(fn)
    return this
  }
  Emitter.prototype.one = function(key, fn){
    return this.on(key, [fn]) // one flag
  }
  Emitter.prototype.off = function(key, fn){
    if (arguments.length === 1) {
      delete this._handlers[key]  // clear all
    } else if (this._handlers[key]) {
      var arr = this._handlers[key]
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === fn || arr[i][0] === fn) {
          arr.splice(i, 1)
          break
        }
      }
    }
    return this
  }

  Emitter.prototype.emit = function(key /*, args*/){
    if (this._handlers[key]) {
      var _slice = Array.prototype.slice
      var args = _slice.call(arguments, 1)
      var arr = this._handlers[key]
      var _arr = arr.concat() // clone
      for (var i = 0, fn; i < _arr.length; i++) {
        fn = _arr[i]
        if (fn[0]) {  // one flag
          fn = fn[0]
          if (arr) arr.splice(i, 1) // may been cleared
          _arr.splice(i--, 1) // rollback i
        }
        fn.apply(this, args)
      }
    }
    return this
  }
  

  if (typeof window === 'object') { // browser
    window.EasyEmitter = Emitter
  } else {  // node
    module.exports = Emitter
  }

})()