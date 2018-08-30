const request = (require('request-promise-native')).defaults({jar: true, time: true, resolveWithFullResponse: true})
const sc = require('./scenarios/scenario_1')
const buildUrlFromScenario = require('./util').buildUrlFromScenario

const responses = {}

function* generateScenarioRequest(sc) {
  const defaults = sc.defaults
  for (let scenario of sc.scenarios) {
    const url = buildUrlFromScenario(scenario, defaults)
    yield request({
      url
    })
  }
}

async function main() {
  for (let response of generateScenarioRequest(sc)) {
    try {
      await response
    } catch (e) {
      responses[response.href] = {error: e.message}
    }
    responses[response.href] = { ...responses[response.href],
      code: response.response.statusCode,
      method: response.method,
      timings: response.timings,
      startTime: response.startTime,
      responseStartTime: response.responseStartTime,
      timingPhases: response.response.timingPhases
    }
    console.log(`Done with ${response.href}`)
  }

  console.log(responses)
}

main()
