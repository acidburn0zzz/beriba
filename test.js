'use strict'

var test = require('tape')
var store = require('./')
var blobs = store('./test/data')

test('put get', (t) => {
  blobs.put('test/foo', 'bar', (err) => {
    t.error(err)
    blobs.get('test/foo', (err, val) => {
      t.error(err)
      t.equal(val, 'bar')
      blobs.remove('test/foo', (err) => {
        t.error(err)
        blobs.get('test/foo', (err, val) => {
          t.ok(err.notFound)
          t.notOk(val)
          t.end()
        })
      })
    })
  })
})
