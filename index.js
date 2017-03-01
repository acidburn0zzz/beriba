var errors = require('./errors')
var storage = [
  require('./storage/fs')
]

function beriba (base, opts) {
  for (var Storage of storage) {
    if (Storage.match(base)) return new Storage(base, opts)
  }
  throw new errors.BlobError('Unidentified storage')
}

beriba.errors = errors

module.exports = beriba
