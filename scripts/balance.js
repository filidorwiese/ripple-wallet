'use strict'
const chalk = require('chalk')
const minimist = require('minimist')
const inquirer = require('inquirer')
const moment = require('moment')
const table = require('good-table')
const RippleAPI = require('ripple-lib').RippleAPI
const RippleAddressCodec = require('ripple-address-codec')


const EPOCH_OFFSET = 946684800

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

        // Show channels
        console.log(chalk.yellow('Outgoing Payment Channels'))
        api.getAccountObjects(address, {type: 'payment_channel'})
          .then(account => {
            if(account.account_objects.length > 0) {
              const channels = []
              let totalAmount = 0
              let totalBalance = 0
              channels.push(['ID', 'Destination', 'Amount', 'Balance', 'Settle Delay', 'Cancel After', 'Expiry'])
              account.account_objects.sort((channelA, channelB) => {
                  if(parseInt(channelA.Amount) == parseInt(channelB.Amount))
                    return parseInt(channelA.Balance) - parseInt(channelB.Balance)
                  return parseInt(channelA.Amount) - parseInt(channelB.Amount)
              }).map((channel) => {
                totalAmount += parseInt(channel.Amount)
                totalBalance += parseInt(channel.Balance)
                channels.push([
                  channel.index,
                  channel.Destination,
                  (parseFloat(channel.Amount) / 1000000.0).toFixed(6),
                  (parseFloat(channel.Balance) / 1000000.0).toFixed(6),
                  (channel.SettleDelay ? 
                    moment.duration(channel.SettleDelay, "seconds").humanize(false) : 'undefined'),
                  (channel.CancelAfter? 
                    moment.duration(channel.CancelAfter, "seconds").humanize(false) : 'undefined'),
                  (channel.Expiration ?
                      moment.unix(channel.Expiration + EPOCH_OFFSET).utc().format() : 'undefined')
                ])
              })
              channels.push(['Total', '', (totalAmount / 1000000.0).toFixed(6), (totalBalance / 1000000.0).toFixed(6)])
              console.log(table(channels))
            } else {
              console.log(' - NONE - ')
            }        
            console.log()

          }, fail)
        
      })
      .then(() => {

        // Show recent transactions
        api.getTransactions(address, {
          limit: limitTransactions
        }).then(transactions => {

          if (transactions.length) {
            const channelCache = {}
            const txLookups = [
              Promise.resolve(['Date and time', 'Transaction ID', 'Type', '', 'Value', 'Fee', '', '', 'Counterparty', ''])
            ]
            transactions.forEach(t => {
              const record = getRecord(t, address)
              if(record[6] === 'UNKNOWN') {
                txLookups.push(getPaymentChannelAccount(api, t.specification.channel, record, channelCache))
              } else {
                txLookups.push(Promise.resolve(record))
              }
            })

            Promise.all(txLookups).then(rows => {
              console.log(chalk.yellow(`Last ${transactions.length} transactions`))
              console.log(table(rows))
              console.log()
              process.exit(0)
            })
          }

        }, fail)

      })

  }).catch(fail)
}
const getPaymentChannelAccount = (api, channelId, record, cache) => {
  
  if(cache[channelId]) {
    record[6] = cache[channelId]
    return Promise.resolve(record)
  }

  return api.getPaymentChannel(channelId)
  .then(channel => {
    cache[channelId] = channel.account
    record[6] = channel.account
    return record
  })
  .catch((e) => {
    return record
  })

}
const getRecord = (record, address) => {

  let outcome = (record.outcome.result === "tesSUCCESS")
  let type, amount, currency, symbol, counterparty
  const timestamp = record.outcome.timestamp.substring(0, 19).replace('T', ' ')
  const id = record.id
  const fee = (record.address === address) ? normalizeXrpAmount('-' + record.outcome.fee, 8) : ''
  const direction = (record.address === address) ?  '→' : '←' 

  switch (record.type) {
    case 'payment':
      
      const source = record.specification.source
      const destination = record.specification.destination

      if (source.address === address) {
        amount = normalizeXrpAmount('-' + source.maxAmount.value)
        currency = source.maxAmount.currency
        symbol =  chalk.white(' → ')
        counterparty = destination.address
        type = 'Payment Out'
      } else {
        amount = normalizeXrpAmount(destination.amount.value)
        currency = destination.amount.currency
        symbol =  chalk.white(' ← ')
        counterparty = source.address
        type = 'Payment In'
      }
      amount = chalk.white(amount)
      break;

    case 'paymentChannelCreate':

      currency = 'XRP'
      type = 'Channel Create'
      if(record.outcome.balanceChanges[address]){
        // Created by us
        amount = chalk.white(normalizeXrpAmount(record.outcome.balanceChanges[address][0].value))
        symbol = '→|' + chalk.green('o') 
        counterparty = record.specification.destination
      } else {
        //Created by them
        amount = chalk.gray(normalizeDropsAmount(record.outcome.channelChanges.channelAmountDrops))
        symbol = chalk.green('o')  + '|←'
        counterparty = record.address
      }
      break;

    case 'paymentChannelFund':

      currency = 'XRP'
      type = 'Channel Fund'
      if(record.outcome.balanceChanges[address]){
        amount = chalk.white(normalizeXrpAmount(record.outcome.balanceChanges[address][0].value))
        symbol = '→| '
        counterparty = getChannelCounterParty(record.outcome.channelChanges, address)
      } else {
        amount = chalk.gray(normalizeXrpAmount(record.outcome.channelChanges.channelBalanceChangeDrops))
        symbol = ' |←'
        counterparty = record.address
      }
      
      break;

    case 'paymentChannelClaim':

      currency = 'XRP'
      counterparty = getChannelCounterParty(record.outcome.channelChanges, address)
      const close = (record.specification.close)
      const incomingChannel = isIncomingChannel(record.outcome.channelChanges, address)
      const wasClaimedByDestination = claimedByDestination(record)

      type = close ? 'Channel Close' : 'Channel Claim'

      if(incomingChannel) {
        if(close) {
          symbol = '←|' + chalk.red('x')              
          if(wasClaimedByDestination) {
              //Incoming channel closed by us
              amount = chalk.white(normalizeXrpAmount(record.outcome.balanceChanges[address][0].value))
            } else {
              //Incoming channel closed by them
              amount = (record.outcome.balanceChanges[address]) ?
                chalk.white(normalizeXrpAmount(record.outcome.balanceChanges[address][0].value)) :
                chalk.gray(normalizeDropsAmount(record.outcome.balanceChanges[counterparty][0].value))
            }
        } else {
          symbol = '←| '              
          if(wasClaimedByDestination) {
              //Incoming channel claim by us
              amount = chalk.white(normalizeXrpAmount(record.outcome.balanceChanges[address][0].value))
          } else {
              //Incoming channel claim by them
              amount = chalk.white(normalizeXrpAmount(record.outcome.balanceChanges[address][0].value))
          }
        }
      } else {
        if(close) {
          symbol = chalk.red('x') + '|→'
          if(wasClaimedByDestination) {
            //Outgoing channel closed by them
            amount = chalk.white(normalizeXrpAmount(record.outcome.balanceChanges[address][0].value))
          } else {
            //Outgoing channel closed by us
            amount = chalk.white(normalizeXrpAmount(record.outcome.balanceChanges[address][0].value))
          }
        } else {
          symbol = ' |→'
          if(wasClaimedByDestination) {
            //Outgoing channel claim by them
            amount = chalk.gray(normalizeDropsAmount('-' + record.outcome.channelChanges.channelBalanceChangeDrops))
          } else {
            //Outgoing channel claim by us
            amount = chalk.white(normalizeXrpAmount(record.outcome.balanceChanges[address][0].value))
          }
        }
      }

      break;

    default:
      type = record.type
      amount = ''
      symbol = ''
      direction = ''
      counterparty = record.address
      currency = '???'
      break
  }

  return [timestamp, id, type, symbol, amount + '', fee, currency, direction, counterparty, (outcome ? chalk.green('✓') : chalk.red('✕'))]

}

//Create right-aligned amounts with a fixed number of decimals
const normalizeDropsAmount = (amount, length = 12, decimals = 6) => {
 return normalizeXrpAmount(parseFloat(amount)/1000000, length, decimals) 
}

const normalizeXrpAmount = (amount, length = 12, decimals = 6) => {
  amount = `${amount}`.trim()
  const number = parseFloat(amount).toFixed(decimals)
  return number.padStart(length, ' ')
}

const claimedByDestination = (record) => {
  if(record.outcome.channelChanges == undefined) return false
  return (record.outcome.channelChanges.destination === record.address) 
}

const isIncomingChannel = (channel, address) => {
  if(channel == undefined) return false
  return (channel.destination === address) 
}

const getChannelCounterParty = (channel, address) => {

  if(channel == undefined) {
    return '????'
  }

  return (channel.source === address) ? 
    channel.destination : 
    channel.source
}

const fail = (message) => {
  console.error(chalk.red(message), "\n")
  process.exit(1)
}

if (process.argv[3] && RippleAddressCodec.isValidAddress(process.argv[3])) {

  getBalance(process.argv[3])

} else {

  const questions = [
    {
      type: 'input',
      name: 'wallet',
      message: 'Enter wallet address:',
      validate: (value) => RippleAddressCodec.isValidAddress(value) ? true : 'Please enter a valid address'
    }
  ]

  inquirer.prompt(questions).then((answers) => {
    console.log()
    getBalance(answers.wallet)
  })

}
