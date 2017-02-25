var pump = require('pump')
var raco = require('raco')({ prepend: true })
var fs = require('fs')
var throat = require('throat')
var eos = require('end-of-stream')
var path = require('path')
var mkdirp = require('mkdirp')

var unlinkQueue = throat(1, raco.wrap(function * (next, filepath) {
  return yield fs.unlink(filepath, (err) => {
    if (err && err.code === 'ENOENT') return next(null, false)
    else if (err) return next(err)
    else return next(null, true)
  })
}))

function Blobs (base, opts) {
  if (!(this instanceof Blobs)) return new Blobs(base, opts)
  this._base = path.resolve(base)
  this._opts = opts || {}
}

Blobs.prototype._getPath = function (key) {
  var filepath = path.join(this._base, key)
  if (filepath.indexOf(this._base) !== 0) {
    throw new Error('Invalid blob key')
  }
  return filepath
}

Blobs.prototype.putFromReadStream = function * (next, key, readStream) {
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

Blobs.prototype.getToWriteStream = function * (next, key, writeStream, size) {
  var readStream = fs.createReadStream(this._getPath(key))
  yield pump(readStream, writeStream, next)
}

Blobs.prototype.getToFile = function * (next, key, filepath) {
  var keypath = this._getPath(key)
  var readStream = fs.createReadStream(keypath)
  var writeStream = fs.createWriteStream(filepath)
  yield pump(readStream, writeStream, next)
}

Blobs.prototype.putFromFile = function * (next, key, filepath) {
  var keypath = this._getPath(key)
  if (this._opts.mkdirp !== false) {
    yield mkdirp(path.dirname(keypath), next)
  }
  var readStream = fs.createReadStream(filepath)
  var writeStream = fs.createWriteStream(keypath)
  yield pump(readStream, writeStream, next)
}

Blobs.prototype.putText = function * (next, key, text) {
  var keypath = this._getPath(key)
  if (this._opts.mkdirp !== false) {
    yield mkdirp(path.dirname(keypath), next)
  }
  return yield fs.writeFile(keypath, text, {
    encoding: 'utf8',
    mode: '0666',
    flag: 'w'
  }, next)
}

Blobs.prototype.getText = function * (next, key) {
  return yield fs.readFile(this._getPath(key), {
    encoding: 'utf8',
    flag: 'r'
  }, next)
}

Blobs.prototype.exists = function * (next, key) {
  return yield fs.stat(this._getPath(key), (err) => {
    if (err && err.code === 'ENOENT') return next(null, false)
    else if (err) return next(err)
    else return next(null, true)
  })
}

Blobs.prototype.head = function * (next, key) {
  return yield fs.stat(this._getPath(key), next)
}

Blobs.prototype.removeOnEnd = function * (next, res, filepath) {
  if (typeof res === 'function') { // if function
    if (res.length === 1) {
      try {
        yield res.call(this, next)
        unlinkQueue(filepath)
      } catch (err) {
        unlinkQueue(filepath)
        throw err
      }
    } else {
    }
  } else { // if stream
    eos(res, () => {
      unlinkQueue(filepath)
    })
  }
}

Blobs.prototype.tmpname = function () {}

raco.wrapAll(Blobs.prototype)

module.exports = Blobs
