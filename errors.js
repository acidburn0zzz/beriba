var create = require('errno').create

var BlobError = create('BlobError')

var NotFoundError = create('NotFoundError', BlobError)
NotFoundError.prototype.notFound = true
NotFoundError.prototype.status = 404

exports.BlobError = BlobError
exports.NotFoundError = NotFoundError
exports.KeyError = create('KeyError', BlobError)
