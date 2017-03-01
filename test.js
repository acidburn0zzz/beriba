'use strict'

var test = require('tape')
var beriba = require('./')
var blobs = beriba('./test/data')
var fs = require('fs')
var raco = require('raco')

var wrap = (genFn) => (t) => raco.wrap(genFn)(t, t.error)

test('putFromFile getFromFile', wrap(function * (t, next) {
  var data = 'foo'
  yield fs.writeFile('testfoo', data, 'utf8', next)
  yield blobs.putFromFile('test/foo', 'testfoo', next)
  yield blobs.getToFile('test/foo', 'testfoo2', next)
  t.equal(yield fs.readFile('testfoo2', 'utf8', next), data)
  yield blobs.remove('test/foo', next)
  try {
    yield blobs.getToFile('test/foo', 'testfoo3', next)
    t.error()
  } catch (err) {
    t.ok(err.notFound)
  }
  t.end()
}))
