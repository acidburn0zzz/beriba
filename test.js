var test = require('tape')
var store = require('./')
var blobs = store('./test/data')
var raco = require('raco')

test('putText getText', (t) => {
  blobs.putText('test/foo.txt', 'bar', (err) => {
    t.error(err)
    blobs.getText('test/foo.txt', (err, text) => {
      t.error(err)
      t.equal(text, 'bar')
      t.end()
    })
  })
})