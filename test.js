'use strict'

var test = require('tape')
var beriba = require('./')
var fs = require('fs')
var raco = require('raco')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')

var dir = './testdata'
var filepath = './testdata/data.txt'
var filedata = Math.random().toString()

var setup = (t, cb) => {
  mkdirp(dir, (err) => {
    t.error(err)
    fs.writeFile(filepath, filedata, 'utf8', cb)
  })
}

var teardown = (t, cb) => {
  rimraf(dir, cb)
}

var wrap = (genFn) => (t) => {
  setup(t, (err) => {
    t.error(err)
    raco.wrap(genFn)(t, () => teardown(t, () => {}))
  })
}

test('putFromFile getFromFile', wrap(function * (t, next) {
  var blobs = beriba(dir + '/blobs')
  var testkey = 'abc/foo'
  t.equal(yield blobs.exists(testkey, next), false, 'blob not exists before put')
  var res = yield blobs.putFromFile(testkey, filepath, next)
  t.equal(yield blobs.exists(testkey, next), true, 'blob exists after put')
  t.equal(res.size, filedata.length, 'return file byte size after put')
  yield blobs.getToFile(testkey, './testdata/2', next)
  t.equal(yield fs.readFile('./testdata/2', 'utf8', next), filedata)
  yield blobs.remove(testkey, next)
  t.equal(yield blobs.exists(testkey, next), false, 'blob not exists after remove')
  try {
    yield blobs.getToFile(testkey, './testdata/3', next)
    t.fail('should not process get not exists')
  } catch (err) {
    t.ok(err.notFound, 'blob notFound error get after remove')
  }
  t.end()
}))
