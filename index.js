var errors = require('./errors')
var storage = [
  require('./storage/fs')
]

function Blobs (base, opts) {
  for (var Store of storage) {
    if (Store.match(base)) return new Store(base, opts)
  }
  throw new errors.BlobError('Unidentified storage')
}

Blobs.errors = errors

module.exports = Blobs
