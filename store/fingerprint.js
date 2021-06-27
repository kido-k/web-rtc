const fingerprint = require('@fingerprintjs/fingerprintjs')
const fpPromise = fingerprint.load()

export const state = () => ({})

export const getters = {}

export const mutations = {
  createFingerprint(state) {
    ;(async () => {
      // Get the visitor identifier when you need it.
      const fp = await fpPromise
      const result = await fp.get()

      // This is the visitor identifier:
      const visitorId = result.visitorId
      localStorage.setItem('fingerprint', visitorId)
    })()
  },
}

export const actions = {}
