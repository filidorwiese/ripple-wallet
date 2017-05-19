'use strict'
const RippleAPI = require('ripple-lib').RippleAPI

const sourceAddress = 'INSERT ADDRESS HERE'
const sourceSecret = 'INSERT SECRET HERE'
const destinationAddress = 'INSERT ADDRESS HERE'
const destinationTag = 'INSERT TAG'
const xrpAmount = '20'

const api = new RippleAPI({
  server: 'wss://s1.ripple.com:443'
})

const instructions = {
  maxLedgerVersionOffset: 5,
  maxFee: 0.15
}

const payment = {
  source: {
    address: sourceAddress,
    maxAmount: {
      value: xrpAmount,
      currency: 'XRP'
    }
  },
  destination: {
    address: destinationAddress,
    tag: destinationTag,
    amount: {
      value: xrpAmount,
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

  return api.preparePayment(sourceAddress, payment, instructions).then(prepared => {

    console.log('Payment transaction prepared...')

    const {signedTransaction} = api.sign(prepared.txJSON, sourceSecret)

    console.log('Payment transaction signed...')

    api.submit(signedTransaction).then(quit, fail)

  })

}).catch(fail)