# easy-emitter

Easy event emitter implementation

## Usage

### Node Module

```js
var Emitter = require('easy-emitter')
Emitter.call(buddy) // become emitter
buddy.on('kick', function onKick(){
  console.log('ouch~')
  if (++this.kickCount >= 5) {
    this.off('kick', onKick)
    console.log('you are dead~')
  }
})
_.times(100, function(){ buddy.emit('kick') })
```

### On Browser

```js
// easy-emitter.js loads
var Emitter = window.EasyEmitter
```

## Emitter Methods

- on(key, fn)
- one(key, fn)
- off(key, [fn])
- emit(key, [*arguments])