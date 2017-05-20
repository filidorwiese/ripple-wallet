'use strict'
const chalk = require('chalk')
const inquirer = require('inquirer')
const RippleAPI = require('ripple-lib').RippleAPI
const deriveKeypair = require('ripple-keypairs').deriveKeypair
const _get = require('lodash.get')

console.log(chalk.green('-----------------------------------------------'))
console.log(chalk.green('Ripple Wallet'), chalk.yellow('Make Payment'))
console.log(chalk.green('-----------------------------------------------'), "\n")

const api = new RippleAPI({
  server: 'wss://s1.ripple.com:443'
})

const RippleAddressRegex = new RegExp(/^r[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{27,35}$/)

const questions = [
  {
    type: 'input',
    name: 'amount',
    message: 'Enter XRP amount to send:',
    validate: (value) => isNaN(parseInt(value)) ? 'Please enter a number' : true
  },
  {
    type: 'input',
    name: 'destinationAddress',
    message: 'Enter destination address:',
    validate: (value) => value.match(RippleAddressRegex) ? true : 'Please enter a valid address'
  },
  {
    type: 'input',
    name: 'destinationTag',
    message: 'Enter destination tag (optional):',
    validate: (value) => value && isNaN(parseInt(value)) ? 'Please enter a number' : true,
    filter: (value) => value && parseInt(value) || ''
  },
  {
    type: 'input',
    name: 'sourceAddress',
    message: 'Enter sender address:',
    validate: (value) => value.match(RippleAddressRegex) ? true : 'Please enter a valid address'
  },
  {
    type: 'input',
    name: 'sourceSecret',
    message: 'Enter sender secret:',
    validate: (value) => {
      try {
        deriveKeypair(value)
        return true
      } catch (e) {
        return 'Invalid secret'
      }
    }
  },
  {
    type: 'confirm',
    name: 'sure',
    message: 'Ready to send?'
  }
]

inquirer.prompt(questions).then((answers) => {
  if (!answers.sure) {
    process.exit()
  }

  const instructions = {
    maxLedgerVersionOffset: 5,
    maxFee: '0.15'
  }

  const payment = {
    source: {
      address: answers.sourceAddress,
      maxAmount: {
        value: answers.amount,
        currency: 'XRP'
      }
    },
    destination: {
      address: answers.destinationAddress,
      tag: answers.destinationTag || undefined,
      amount: {
        value: answers.amount,
        currency: 'XRP'
      }
    }
  }

  api.connect().then(() => {

    console.log("\nConnected...")

    return Promise.all([
      api.getBalances(answers.sourceAddress, {currency: 'XRP'}),
      api.getBalances(answers.destinationAddress, {currency: 'XRP'})
    ]).then((currentBalances) => {

      console.log('Current source balance:', chalk.green(_get(currentBalances, '[0][0].value', 0), 'XRP'))

      console.log('Current destination balance:', chalk.green(_get(currentBalances, '[1][0].value', 0), 'XRP'))

      return api.preparePayment(answers.sourceAddress, payment, instructions).then(prepared => {

        console.log('Payment transaction prepared...')

        const {signedTransaction} = api.sign(prepared.txJSON, answers.sourceSecret)

        console.log('Payment transaction signed...')

        return api.submit(signedTransaction).then(() => {

          console.log('Waiting for balance to update (use Ctrl-C to abort)')

          waitForBalancesUpdate(answers.sourceAddress, answers.destinationAddress, currentBalances)

        }, fail)

      })

    })

  }).catch(fail)

})


function waitForBalancesUpdate(sourceAddress, destinationAddress, currentBalances) {

  Promise.all([
    api.getBalances(sourceAddress, {currency: 'XRP'}),
    api.getBalances(destinationAddress, {currency: 'XRP'})
  ]).then((newBalances) => {

    if (_get(newBalances, '[0][0].value', 0) < _get(currentBalances, '[0][0].value', 0)) {

      console.log('New source balance:', chalk.green(_get(newBalances, '[0][0].value', 0), 'XRP'))

      console.log('New destination balance:', chalk.green(_get(newBalances, '[1][0].value', 0), 'XRP'))

      process.exit(0)

    } else {

      setTimeout(() => waitForBalancesUpdate(sourceAddress, destinationAddress, currentBalances), 1000)

    }

  })

}

function fail (message) {
  console.error(chalk.red(message), "\n")
  process.exit(1)
}