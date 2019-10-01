'use strict'

const { inject } = require('./injector')

const INTERNAL_PATTERN = /context-injector(?!\/test)|\/node_modules\//
const excludePatterns = [INTERNAL_PATTERN]

function wrap(f, lineNumber, fileName) {
  const scheduledContext = module.exports.context
  if (typeof f !== 'function' || !scheduledContext) {
    return f
  }


  return new Proxy(f, {
    get: function getTrap(target, prop) {
      // Allow for look up of the target
      if (prop === '__INJ_original') {
        return target
      }
      return target[prop]
    },
    construct: function constructTrap(Target, proxyArgs) {
      const activeContext = module.exports.context
      const activeLn = lineNumber
      const activeFile = fileName

      module.exports.context = scheduledContext
      module.exports.lineNumber = lineNumber
      module.exports.fileName = fileName

      const instance = new Target(...proxyArgs)

      module.exports.context = activeContext
      module.exports.lineNumber = activeLn
      module.exports.fileName = activeFile

      return instance
    },
    apply: function wrappedApply(target, thisArg, args) {
      const activeContext = module.exports.context
      const activeLn = lineNumber
      const activeFile = fileName

      module.exports.context = scheduledContext
      module.exports.lineNumber = lineNumber
      module.exports.fileName = fileName

      const res = target.apply(thisArg, args)

      module.exports.context = activeContext
      module.exports.lineNumber = activeLn
      module.exports.fileName = activeFile

      return res
    }
  })
}

function unwrap(f) {
  if (typeof f !== 'function' || !f || !f.__INJ_original) {
    return f
  }

  return f.__INJ_original
}

let patched = false

module.exports = {
  context: null,
  fileName: null,
  lineNumber: null,
  registerExcludePattern: (pattern) => {
    excludePatterns.push(pattern)
  },

  installCompileHooks: () => {
    if (patched) {
      return
    }
    patched = true

    global.__INJ_wrap = wrap
    global.__INJ_unwrap = unwrap

    // how do we unpatch this?
    const proto = require('module').prototype
    const oldCompile = proto._compile
    proto._compile = function wrappedCompile(code, file) {
      for (let pattern of excludePatterns) {
        if (pattern.test(file)) {
          return oldCompile.call(this, code, file)
        }
      }
      try {
        return oldCompile.call(this, inject(code, file), file)
      } catch (e) {
        console.log('ran into a parser error', e)
        return oldCompile.call(this, code, file)
      }
    }
  },

  startContext: () => {
    return module.exports.context = {}
  }
}
