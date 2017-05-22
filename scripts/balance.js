'use strict'
const chalk = require('chalk')
const inquirer = require('inquirer')
const RippleAPI = require('ripple-lib').RippleAPI

//rJysCK99GqUBmgB54mcV7NwxYH29NRs1QQ
const RippleAddressRegex = new RegExp(/^r[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{27,35}$/)

console.log(chalk.green('-----------------------------------------------'))
console.log(chalk.green('Ripple Wallet'), chalk.yellow('Balance Check'))
console.log(chalk.green('-----------------------------------------------'), "\n")

const getBalance = (address) => {
  const api = new RippleAPI({server: 'wss://s1.ripple.com:443'})

  api.connect().then(() => {

    api.getBalances(address).then(balances => {
      balances.map((currency) => {
        console.log('  ' + chalk.green(currency.value, currency.currency))
      })
      console.log()
      process.exit(0)
    }, fail)

  }).catch(fail)
}

const fail = (message) => {
  console.error(chalk.red(message), "\n")
  process.exit(1)
}

if (process.argv[3] && process.argv[3].match(RippleAddressRegex)) {

  getBalance(process.argv[3])

} else {

  const questions = [
    {
      type: 'input',
      name: 'wallet',
      message: 'Enter wallet address:',
      validate: (value) => value.match(RippleAddressRegex) ? true : 'Please enter a valid address'
    }
  ]

  inquirer.prompt(questions).then((answers) => {
    console.log()
    getBalance(answers.wallet)
  })

}
