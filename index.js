const request = (require('request-promise-native')).defaults({jar: true, time: true, resolveWithFullResponse: true})
const buildUrlFromScenario = require('./util').buildUrlFromScenario
const pino = require('pino')()
const fs = require('fs')
const fileToProcess = process.argv[2]

if(!fileToProcess) {
  pino.error('You must specify a file to process')
}
//const sc = require('./scenarios/scenario_1')
const sc = require(fileToProcess)

const responses = {}

function* generateScenarioRequest(sc) {
  const defaults = sc.defaults
  for (let scenario of sc.scenarios) {
    const url = buildUrlFromScenario(scenario, defaults)
    const method = scenario.method || defaults.method
    const form = scenario.form || null
    yield [request({
      url,
      method,
      form
    }), scenario]
  }
}

async function main() {
  let response, scenario
  for ([response, scenario] of generateScenarioRequest(sc)) {
    try {
      await response
      if (scenario.expectations) {
        response.expectations = scenario.expectations
        for (let i = 0; i < scenario.expectations.length; i++) {
          switch (scenario.expectations[i].type) {
            case 'regex':
              response.expectations[i].result = new RegExp(scenario.expectations[i].value).exec(response.response.body)
              break
            case 'favicon':
              const remoteFavicon = (await request({
                encoding: null,
                time: true,
                resolveWithFullResponse: true,
                url: response.href
              })).body
              const equals = remoteFavicon.equals(fs.readFileSync('./assets/' + scenario.expectations[i].filename))
              response.expectations[i].result = equals
              break
          }
        }
      }
    } catch (e) {
      responses[response.href] = {error: e.message}
    }
    fillResponses(response)
  }
  pino.info(responses)
}

function fillResponses(response) {
  responses[response.href] = {
    ...responses[response.href],
    code: response.response ? response.response.statusCode : null,
    method: response.method,
    timings: response.timings,
    startTime: response.startTime,
    responseStartTime: response.response ? response.responseStartTime : null,
    timingPhases: response.response ? response.response.timingPhases : null,
    expectations: response.expectations || null
  }
}

main()
