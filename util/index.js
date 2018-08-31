const querystring = require('querystring')

module.exports.buildUrlFromScenario = (scenario, defaults) => {
  return (scenario.schema || defaults.schema) + '://' +
    (scenario.server || defaults.server) +
    (scenario.url) +
    (scenario.query ? '?' + querystring.stringify(scenario.query) : '')
}
