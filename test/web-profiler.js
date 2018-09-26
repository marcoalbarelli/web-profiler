const chai = require('chai')
chai.use(require('chai-as-promised'))
const expect = chai.expect
const wp = require('../index')

describe('web-profiler', () => {
  it('crashes if not given a scenario to run as an argument', async () => {
    await wp()
      .catch((e) => {
        expect(e.message).to.match(/You must specify a scenario to process/)
      })
  })
  it('crashes if given an invalid scenario', async () => {
    await wp({})
      .catch((e) => {
        expect(e.message).to.match(/is not iterable/)
      })
  })
  it('returns json with timings if given a valid scenario', async () => {
    const scenario = require('./scenario_1')
    scenario.scenarios.map((s) => {
      if(s.expectations) {
        s.expectations.map((e) => {
          if(e.type==='favicon') {
            e.filename = __dirname+'/../assets/'+e.filename
          }
        })
      }
    })
    const output = await wp(scenario)
    expect(output).to.be.instanceOf(Object)
    Object.keys(output).map((r) => {
      expect(output[r].timings).to.not.be.null
      expect(output[r].code).to.not.be.undefined
      expect(output[r].method).to.not.be.null
      expect(output[r].expectations).to.not.be.undefined
    })
  })
})
