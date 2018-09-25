const options = {jar: true, time: true, resolveWithFullResponse: true}
const request = (require('request-promise-native')).defaults(options)
const buildUrlFromScenario = require('./util').buildUrlFromScenario
const fs = require('fs')
const xpath = require('xpath')
const dom = require('xmldom').DOMParser

function* generateScenarioRequest(sc) {
  const defaults = sc.defaults
  let feedback
  for (let scenario of sc.scenarios) {
    let requestArgs = {}
    if (feedback) {
      requestArgs = {
        url: buildUrlFromScenario(feedback, defaults),
        method: feedback.method || defaults.method,
        followRedirects: feedback.followRedirects || false
      }
      requestArgs.form = feedback.form

    } else {
      requestArgs = {
        url: buildUrlFromScenario(scenario, defaults),
        form: scenario.form || null,
        method: scenario.method || defaults.method,
        followRedirects: scenario.follow || false
      }
    }

    feedback = yield [request(requestArgs), scenario]
  }
}

function prepareDomInputsForProgrammaticPOST(inputs, scenario) {
  return inputs.reduce((acc, n) => {
    const id = n.attributes.getNamedItem('id') ? n.attributes.getNamedItem('id').value : undefined
    const name = n.attributes.getNamedItem('name') ? n.attributes.getNamedItem('name').value : null
    const type = n.attributes.getNamedItem('type') ? n.attributes.getNamedItem('type').value : null
    if (type === 'submit' && name !== scenario.submitButtonName) {
      return acc
    }

    let value

    if (id && scenario.form[id]) {
      value = scenario.form[id]
    } else {
      value = n.attributes.getNamedItem('value') ? n.attributes.getNamedItem('value').value : null
    }
    if (name && value !== null) {
      acc[name] = value
    }
    return acc
  }, {})
}

function retrieveFeedbackActionForEz(response, scenario) {
  const doc = new dom({
    errorHandler: (arg) => {
      //silence is golden. Plus we're not linting other people's ~code~ HTML
    }
  }).parseFromString(response.response.body)
  const editForm = xpath.select("//form[@class='edit']", doc)[0]
  const action = editForm.attributes.getNamedItem('action').value

  /**
   * We're ignoring selects and textareas for the time being
   */
  const inputs = xpath.select("//form[@class='edit']/descendant::input", doc)
  const mapped = prepareDomInputsForProgrammaticPOST(inputs, scenario)
  return {
    form: mapped,
    url: action,
    method: 'POST',
    followRedirects: true
  }
}

async function evaluateExpectations(response, scenario) {
  response.expectations = scenario.expectations

  for (let i = 0; i < scenario.expectations.length; i++) {
    switch (scenario.expectations[i].type) {
      case 'code':
        response.expectations[i].result = scenario.expectations[i].value === response.response.statusCode
        break
      case 'regex':
        response.expectations[i].result = new RegExp(scenario.expectations[i].value).exec(response.response.body)
        break
      case 'favicon':
        response.expectations[i].result = (await request({
          encoding: null, //otherwise it gets a base64 encoding which screws things up
          time: true,
          resolveWithFullResponse: true,
          url: response.href
        })).body.equals(fs.readFileSync(scenario.expectations[i].filename))
        break
    }
  }
}

function fillResponses(responses, response) {
  responses[response.href] = {
    ...responses[response.href],
    finalHref: response.href,
    name: response.name,
    code: response.response ? response.response.statusCode : null,
    method: response.method,
    timings: response.timings,
    startTime: response.startTime,
    responseStartTime: response.response ? response.responseStartTime : null,
    timingPhases: response.response ? response.response.timingPhases : null,
    expectations: response.expectations || null
  }
}

module.exports = async function main(sc = null) {
  const responses = {}
  if(!sc) {
    throw new Error('You must specify a scenario to process')
  }
  let response, scenario, feedback
  let done = false
  let iteration
  const generator = generateScenarioRequest(sc)
  while (!done) {
    iteration = generator.next(feedback)
    feedback = undefined
    done = iteration.done
    if (!done) {
      response = iteration.value[0] || null
      scenario = iteration.value[1] || null
      response.name = scenario.name
      try {
        await response

        if (scenario.expectations) {
          await evaluateExpectations(response, scenario)
        }

        if (scenario.nextStepIsEzEdit) {
          feedback = retrieveFeedbackActionForEz(response, scenario)
        }
      } catch (e) {

        if (scenario.expectations) {
          await evaluateExpectations(response, scenario)
        }
        responses[response.href] = {error: e.message}
      }
      fillResponses(responses, response)
    }
  }
  return responses
}


