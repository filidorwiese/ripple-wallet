'use strict'
const chalk = require('chalk')
const RippleKeypairs = require('ripple-keypairs')
const config = require('./config.json')

console.log(chalk.green('-----------------------------------------------'))
console.log(chalk.green('Ripple Wallet'), chalk.yellow('Generate Wallet'))
console.log(chalk.green('-----------------------------------------------'), '\n')

const seed = RippleKeypairs.generateSeed()
const keypair = RippleKeypairs.deriveKeypair(seed)
const address = RippleKeypairs.deriveAddress(keypair.publicKey)

console.log('  Public address:', chalk.yellow(address))
console.log('  Wallet secret:', chalk.yellow(seed), '\n')

console.log(chalk.red('  Print this wallet and make sure to store it somewhere safe!'), '\n')
console.log(`  Note: You need to put at least ${config.baseReserve} ${config.currency} on this key for it to be an active account\n`)