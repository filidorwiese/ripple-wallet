'use strict'
const inquirer = require('inquirer')
const RippleAPI = require('ripple-lib').RippleAPI

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
    validate: (value) => !!value
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
    validate: (value) => !!value
  },
  {
    type: 'input',
    name: 'sourceSecret',
    message: 'Enter sender secret:',
    validate: (value) => !!value
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

  const api = new RippleAPI({
    server: 'wss://s1.ripple.com:443'
  })

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

  function quit (message) {
    console.log(message)
    process.exit(0)
  }

  function fail (message) {
    console.error(message)
    process.exit(1)
  }

  api.connect().then(() => {

    console.log('Connected...')

    return api.preparePayment(answers.sourceAddress, payment, instructions).then(prepared => {

      console.log('Payment transaction prepared...')

      const {signedTransaction} = api.sign(prepared.txJSON, answers.sourceSecret)

      console.log('Payment transaction signed...')

      api.submit(signedTransaction).then(quit, fail)

    })

  }).catch(fail)

})

