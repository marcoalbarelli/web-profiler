const pino = require('pino')()

const fileToProcess = process.argv[2]

if (!fileToProcess) {
  throw new Error('You must specify a file to process')
}

const sc = require(fileToProcess)

const web_profiler = require('./index.js')
web_profiler(sc)
  .then((result) => {
    pino.info(result)
  })
