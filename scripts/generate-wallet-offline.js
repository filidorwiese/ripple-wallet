'use strict'
const RippleAPI = require('ripple-lib').RippleAPI

const api = new RippleAPI()
const account = api.generateAddress()

console.log(account)