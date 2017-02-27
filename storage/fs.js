var pump = require('pump')
var raco = require('raco')({ prepend: true })
var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var errors = require('../errors')

function Store (base, opts) {
  this._base = path.resolve(base)
  this._opts = opts || {}
}

Store.match = function (base) {
  return typeof base === 'string'
}

Store.prototype.toString = function () {
  return 'fs'
}

Store.prototype._getPath = function (key) {
  var filepath = path.join(this._base, key)
  if (filepath.indexOf(this._base) !== 0) throw new errors.KeyError(`Invalid key ${key}`)
  return filepath
}

Store.prototype.getToWriteStream = function * (next, key, writeStream, size) {
  var readStream = fs.createReadStream(this._getPath(key))
  yield pump(readStream, writeStream, (err) => {
    if (err && err.code === 'ENOENT') return next(new errors.NotFoundError(`Key ${key} not found`, err))
    else return next(err)
  })
}

Store.prototype.getToFile = function * (next, key, filepath) {
  var keypath = this._getPath(key)
  var readStream = fs.createReadStream(keypath)
  var writeStream = fs.createWriteStream(filepath)
  yield pump(readStream, writeStream, (err) => {
    if (err && err.code === 'ENOENT') return next(new errors.NotFoundError(`Key ${key} not found`, err))
    else return next(err)
  })
}

Store.prototype.get = function * (next, key) {
  return yield fs.readFile(this._getPath(key), {
    encoding: 'utf8',
    flag: 'r'
  }, (err, val) => {
    if (err && err.code === 'ENOENT') return next(new errors.NotFoundError(`Key ${key} not found`, err))
    else if (err) return next(err)
    else return next(null, val)
  })
}

Store.prototype.putFromReadStream = function * (next, key, readStream) {
  var keypath = this._getPath(key)
  if (this._opts.mkdirp !== false) {
    yield mkdirp(path.dirname(keypath), next)
  }
  var writeStream = fs.createWriteStream(keypath)
  yield pump(readStream, writeStream, next)
  return {
    size: writeStream.bytesWritten
  }
}

Store.prototype.putFromFile = function * (next, key, filepath) {
  var keypath = this._getPath(key)
  if (this._opts.mkdirp !== false) {
    yield mkdirp(path.dirname(keypath), next)
  }
  var readStream = fs.createReadStream(filepath)
  var writeStream = fs.createWriteStream(keypath)
  yield pump(readStream, writeStream, next)
}

Store.prototype.put = function * (next, key, val) {
  var keypath = this._getPath(key)
  if (this._opts.mkdirp !== false) {
    yield mkdirp(path.dirname(keypath), next)
  }
  return yield fs.writeFile(keypath, val, {
    encoding: 'utf8',
    mode: '0666',
    flag: 'w'
  }, next)
}

Store.prototype.exists = function * (next, key) {
  return yield fs.stat(this._getPath(key), (err) => {
    if (err && err.code === 'ENOENT') return next(null, false)
    else if (err) return next(err)
    else return next(null, true)
  })
}

Store.prototype.remove = function * (next, key) {
  return yield fs.unlink(this._getPath(key), (err) => {
    if (err && err.code === 'ENOENT') return next(null, false)
    else if (err) return next(err)
    else return next(null, true)
  })
}

raco.wrapAll(Store.prototype)

module.exports = Store
