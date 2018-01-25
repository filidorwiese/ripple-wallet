'use strict'
const chalk = require('chalk')
const minimist = require('minimist')
const inquirer = require('inquirer')
const RippleAPI = require('ripple-lib').RippleAPI
const deriveKeypair = require('ripple-keypairs').deriveKeypair
const _get = require('lodash.get')

console.log(chalk.green('-----------------------------------------------'))
console.log(chalk.green('Ripple Wallet'), chalk.yellow('Make Payment'))
console.log(chalk.green('-----------------------------------------------'), "\n")

const argv = minimist(process.argv.slice(2))
const currency = argv.currency || 'XRP'
const maxFee = argv['max-fee'] || '0.15'

const api = new RippleAPI({
  server: process.env.RIPPLE_API || 'wss://s1.ripple.com:443'
})

const RippleAddressRegex = new RegExp(/^r[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{27,35}$/)

const waitForBalancesUpdate = (sourceAddress, destinationAddress, origSourceBalance) => {
  Promise.all([
    api.getBalances(sourceAddress, { currency: 'XRP' }),
    api.getBalances(destinationAddress, { currency: 'XRP' })
      .catch(handleActNotFound)
  ]).then((newBalances) => {

    if (_get(newBalances, '[0][0].value', 0) < origSourceBalance) {

      console.log('New source balance:', chalk.green(_get(newBalances, '[0][0].value', 0), 'XRP'))

      console.log('New destination balance:', chalk.green(_get(newBalances, '[1][0].value', 0), 'XRP'))

      process.exit(0)

    } else {

      setTimeout(() => waitForBalancesUpdate(sourceAddress, destinationAddress, origSourceBalance), 1000)

    }

  })
}

const handleActNotFound = (err) => {
  if (err.toString().indexOf('actNotFound') !== -1) {
    return [{ currency: 'XRP', value: '0' }]
  }
  return Promise.reject(err);
}

const fail = (message) => {
  console.error(chalk.red(message), "\n")
  process.exit(1)
}

const questions = [
  {
    type: 'input',
    name: 'amount',
    default: argv.amount,
    message: 'Enter ' + currency + ' amount to send:',
    validate: (value) => isNaN(parseInt(value)) ? 'Please enter a number' : true
  },
  {
    type: 'input',
    name: 'destinationAddress',
    default: argv.to,
    message: 'Enter destination address:',
    validate: (value) => value.match(RippleAddressRegex) ? true : 'Please enter a valid address'
  },
  {
    type: 'input',
    name: 'destinationTag',
    default: argv.tag,
    message: 'Enter destination tag (optional):',
    validate: (value) => value && isNaN(parseInt(value)) ? 'Please enter a number' : true,
    filter: (value) => value && parseInt(value) || ''
  },
  {
    type: 'input',
    name: 'sourceAddress',
    default: argv.from,
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
  }
]

inquirer.prompt(questions).then((answers) => {
  const instructions = {
    maxLedgerVersionOffset: 5,
    maxFee
  }

  const payment = {
    source: {
      address: answers.sourceAddress,
      maxAmount: {
        value: answers.amount.toString(),
        currency
      }
    },
    destination: {
      address: answers.destinationAddress,
      tag: answers.destinationTag || undefined,
      amount: {
        value: answers.amount.toString(),
        currency
      }
    }
  }

  api.connect().then(() => {
    if (answers.sourceAddress === answers.destinationAddress) {
      fail('Sender address not be the same as the destination address')
    }
    console.log()

    return Promise.all([
      api.getBalances(answers.sourceAddress, { currency: 'XRP' }),
      api.getBalances(answers.destinationAddress, { currency: 'XRP' })
        .catch(handleActNotFound)
    ]).then((currentBalances) => {
      const destinationBalance = _get(currentBalances, '[1][0].value', 0)

      console.log('Current destination balance:', chalk.green(destinationBalance, 'XRP'))
      if (destinationBalance + answers.amount < 20) {
        fail('Send at least 20 XRP to create the destination address')
      }

      const sourceBalance = _get(currentBalances, '[0][0].value', 0)
      console.log('Current sender balance:', chalk.green(sourceBalance, 'XRP'))
      if (sourceBalance - answers.amount < 20) {
        fail('There should be at least 20 XRP remaining at the sender address')
      }

      inquirer.prompt([
        {
          type: 'confirm',
          name: 'sure',
          default: false,
          message: 'Ready to send?'
        }
      ]).then((confirm) => {
        if (!confirm.sure) {
          process.exit()
        }

        console.log("\nPreparing payment transaction...")

        return api.preparePayment(answers.sourceAddress, payment, instructions).then(prepared => {

          const { signedTransaction } = api.sign(prepared.txJSON, answers.sourceSecret)

          console.log('Submitting payment...')

          return api.submit(signedTransaction).then(() => {

            console.log('Waiting for balance to update (use Ctrl-C to abort)')

            waitForBalancesUpdate(answers.sourceAddress, answers.destinationAddress, sourceBalance)

          }, fail)

        })

      })

    })

  }).catch(fail)

})
