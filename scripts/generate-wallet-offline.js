'use strict'
const chalk = require('chalk')
const RippleAPI = require('ripple-lib').RippleAPI

console.log('-----------------------------------------------')
console.log(chalk.green('Ripple wallet'), '-', chalk.yellow('Generate Wallet'))
console.log('-----------------------------------------------')

const api = new RippleAPI()
const account = api.generateAddress()

console.log('Public address: ', account.address)
console.log('Wallet secret: ', chalk.red(account.secret), "\n")
