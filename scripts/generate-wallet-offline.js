'use strict'
const chalk = require('chalk')
const RippleAPI = require('ripple-lib').RippleAPI

console.log('-----------------------------------------------')
console.log(chalk.green('Ripple wallet'), '-', chalk.yellow('Generate Wallet'))
console.log('-----------------------------------------------', "\n")

const api = new RippleAPI()
const account = api.generateAddress()

console.log('Public address: ', account.address)
console.log('Wallet secret: ', account.secret, "\n")

console.log(chalk.red('** Print this wallet and make sure to store it safely **'), "\n")