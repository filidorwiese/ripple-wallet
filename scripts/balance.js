'use strict'
const chalk = require('chalk')
const inquirer = require('inquirer')
const RippleAPI = require('ripple-lib').RippleAPI

const RippleAddressRegex = new RegExp(/^r[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{27,35}$/)

console.log(chalk.green('-----------------------------------------------'))
console.log(chalk.green('Ripple Wallet'), chalk.yellow('Balance Check'))
console.log(chalk.green('-----------------------------------------------'), "\n")

const questions = [
  {
    type: 'input',
    name: 'wallet',
    message: 'Enter wallet address:',
    validate: (value) => value.match(RippleAddressRegex) ? true : 'Please enter a valid address'
  }
]

inquirer.prompt(questions).then((answers) => {

  const api = new RippleAPI({server: 'wss://s1.ripple.com:443'})

  api.connect().then(() => {
    try {
      api.getBalances(answers.wallet).then(balances => {
        console.log(JSON.stringify(balances, null, 2))
        process.exit(0)
      })
    } catch (e) {
      console.error('Invalid address')
      process.exit(1)
    }
  })

})
