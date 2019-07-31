'use strict'

const tap = require('tap')
const contextInjector = require('../../')
contextInjector.installCompileHooks()
const tests = require('./test-cases')

tap.test('injector', (t) => {
  t.autoend()
  Object.keys(tests).forEach(testName => {
    t.test(testName, tests[testName].bind(null, contextInjector))
  })
})
