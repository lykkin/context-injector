'use strict'

module.exports = {
  'should propagate state over timers': function timerTest(inj, t) {
    const context = inj.startContext()
    setTimeout(function() {
      t.equals(context, inj.context, 'context should be reinstated')
      t.end()
    }, 100)
  },
  'should handle multiple contexts properly': function timerTest(inj, t) {
    const context = inj.startContext()
    setTimeout(function() {
      t.equals(context, inj.context, 'context should be reinstated')
      const context3 = inj.startContext()
      t.equals(context3, inj.context, 'context should be reinstated')
      process.nextTick(() => {
        t.equals(context3, inj.context, 'context should be reinstated')
        done()
      })
    }, 100)
    const context2 = inj.startContext()
    setImmediate(function() {
      t.equals(context2, inj.context, 'context should be reinstated')
      done()
    }, 100)

    let counter = 0
    function done() {
      if (++counter === 2) {
        t.end()
      }
    }
  },
  'should handle promises properly': function(inj, t) {
    let context = inj.startContext()
    const startContext = context
    new Promise((res, rej) => {
      t.equals(startContext, inj.context, 'context should be reinstated')
      context = inj.startContext()
      t.notEquals(startContext, inj.context, 'context should change')
      res()
    }).then(() => {
      t.equals(context, inj.context, 'context should be reinstated')
      t.notEquals(startContext, inj.context, 'context should change')
      t.end()
    })
  }
}
