'use strict'
const RippleAPI = require('ripple-lib').RippleAPI

var api = new RippleAPI()
var account = api.generateAddress()

console.log(account)