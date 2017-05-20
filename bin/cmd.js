#! /usr/bin/env node
const chalk = require('chalk')

if (process.version.match(/v(\d+)\./)[1] < 6) {

  console.error('ripple-wallet-cli: Node v6 or greater is required.')

} else {

  switch (process.argv[2]) {
    case 'generate':
    case 'balance':
    case 'pay':
      require(`../scripts/${process.argv[2]}.js`)
      break;
    default:
      console.log("\n ", 'Usage: ' + chalk.green('ripple-wallet-cli') + ' ' + chalk.yellow('[command]') + '', "\n")
      console.log('  Available commands:', "\n")
      console.log(chalk.yellow('  generate'), "\t", 'to generate a new wallet address + secret (works offline)')
      console.log(chalk.yellow('  balance'), "\t", 'to check the available funds on a given Ripple address')
      console.log(chalk.yellow('  pay'), "\t\t", 'to move funds from one address to another', "\n")
      process.exit(-1)
      break;
  }

}
