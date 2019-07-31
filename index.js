'use strict'

const { inject } = require('./injector')

const INTERNAL_PATTERN = /context-injector(?!\/test)|\/node_modules\//
const excludePatterns = [INTERNAL_PATTERN]

function wrap(f, lineNum, fileName) {
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
      module.exports.context = scheduledContext
      const instance = new Target(...proxyArgs)
      module.exports.context = activeContext
      return instance
    },
    apply: function wrappedApply(target, thisArg, args) {
      const activeContext = module.exports.context
      module.exports.context = scheduledContext
      const res = target.apply(thisArg, args)
      module.exports.context = activeContext
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
