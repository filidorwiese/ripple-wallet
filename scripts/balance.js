'use strict'
const chalk = require('chalk')
const minimist = require('minimist')
const inquirer = require('inquirer')
const RippleAPI = require('ripple-lib').RippleAPI
const RippleAddressCodec = require('ripple-address-codec')

console.log(chalk.green('-----------------------------------------------'))
console.log(chalk.green('Ripple Wallet'), chalk.yellow('Balance Check'))
console.log(chalk.green('-----------------------------------------------'), "\n")

const argv = minimist(process.argv.slice(3))
const limitTransactions = argv.limit || 10

const getBalance = (address) => {
  const api = new RippleAPI({
    server: process.env.RIPPLE_API || 'wss://s2.ripple.com:443'
  })

  api.connect().then(() => {

    // Show balances
    console.log(chalk.yellow('Current Balance'))
    api.getBalances(address)
      .then(balances => {

        balances.filter(c => c.value > 0).map((currency) => {
          console.log(currency.value, currency.currency)
        })
        console.log()

      }, fail)
      .then(() => {

        // Show recent transactions
        api.getTransactions(address, {
          limit: limitTransactions
        }).then(transactions => {

          if (transactions.length) {
            console.log(chalk.yellow(`Last ${transactions.length} transactions`))
            transactions.forEach(t => displayRecord(t, address))
            console.log()
          }

          process.exit(0)
        }, fail)

      })

  }).catch(fail)
}

const displayRecord = (record, address) => {
  const source = record.specification.source
  const destination = record.specification.destination

  switch (record.type) {
    case 'payment':
      let amount, currency, plusMinus, directionArrow, to

      amount = +parseFloat(source.maxAmount.value).toFixed(5)
      currency = source.maxAmount.currency

      if (source.address === address) {
        plusMinus = '-'
        directionArrow =  '→'
        to = destination.address

      } else {
        plusMinus = '+'
        directionArrow =  '←'
        to = source.address

      }

      console.log(`${record.type}\t${plusMinus}${amount} ${currency} ${directionArrow} ${to}`)
      break
    default:
      console.log(`${record.type}`)
      break
  }
}

const fail = (message) => {
  console.error(chalk.red(message), "\n")
  process.exit(1)
}

if (process.argv[3] && RippleAddressCodec.isValidClassicAddress(process.argv[3])) {

  getBalance(process.argv[3])

} else {

  const questions = [
    {
      type: 'input',
      name: 'wallet',
      message: 'Enter wallet address:',
      validate: (value) => RippleAddressCodec.isValidClassicAddress(value) ? true : 'Please enter a valid address'
    }
  ]

  inquirer.prompt(questions).then((answers) => {
    console.log()
    getBalance(answers.wallet)
  })

}
