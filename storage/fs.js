'use strict'

var pump = require('pump')
var raco = require('raco')({ prepend: true })
var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var duplexify = require('duplexify')
var readsy = require('readsy')
var writsy = require('writsy')
var errors = require('../errors')

class FileStorage {
  constructor (base, opts) {
    this._base = path.resolve(base)
    this._opts = opts || {}
  }

  static match (base) {
    return typeof base === 'string'
  }

  _getPath (key) {
    var filepath = path.join(this._base, key)
    if (filepath.indexOf(this._base) !== 0) throw new errors.KeyError(`Invalid key ${key}`)
    return filepath
  }

  _mkdirp (keypath, cb) {
    // TODO LRU cache
    if (this._opts.mkdirp !== false) {
      mkdirp(path.dirname(keypath), cb)
    } else {
      cb()
    }
  }

  createReadStream (key) {
    var proxy = readsy((cb) => {
      try {
        cb(null, fs.createReadStream(this._getPath(key)))
      } catch (err) {
        cb(err)
      }
    })
    // standarize notFound error
    proxy.destroy = function (err) {
      if (err && err.code === 'ENOENT') {
        return destroy.call(proxy, new errors.NotFoundError(`Key ${key} not found`, err))
      } else {
        return readsy.prototype.destroy.call(proxy, err)
      }
    }
    return proxy
  }

  createWriteStream (key) {
    var keypath, writeStream
    var proxy = writsy((cb) => {
      try {
        keypath = this._getPath(key)
      } catch (err) {
        return cb(err)
      }
      this._mkdirp(keypath, (err) => {
        if (err) return cb(err)
        writeStream = fs.createWriteStream(keypath)
        cb(null, writeStream)
      })
    }, (cb) => {
      proxy.size = writeStream.bytesWritten
      cb()
    })
    return proxy
  }

  * getToWriteStream (next, key, writeStream, size) {
    var readStream = this.createReadStream(key)
    yield pump(readStream, writeStream, next)
    return readStream
  }

  * getToFile (next, key, filepath) {
    var readStream = this.createReadStream(key)
    var writeStream = fs.createWriteStream(filepath)
    yield pump(readStream, writeStream, next)
    return readStream
  }

  * putFromReadStream (next, key, readStream) {
    var writeStream = this.createWriteStream(key)
    yield pump(readStream, writeStream, next)
    return writeStream
  }

  * putFromFile (next, key, filepath) {
    var readStream = fs.createReadStream(filepath)
    var writeStream = this.createWriteStream(key)
    yield pump(readStream, writeStream, next)
    return writeStream
  }

  * exists (next, key) {
    return yield fs.stat(this._getPath(key), (err, stat) => {
      if (err && err.code !== 'ENOENT') return next(err)
      else return next(null, !!stat)
    })
  }

  * remove (next, key) {
    return yield fs.unlink(this._getPath(key), (err) => {
      if (err && err.code !== 'ENOENT') return next(err)
      else return next(null)
    })
  }
}

raco.wrapAll(FileStorage.prototype)

module.exports = FileStorage
