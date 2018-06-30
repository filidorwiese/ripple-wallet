# Ripple Wallet

A lightweight command-line Ripple client built with node and the official [ripple-lib](https://github.com/ripple/ripple-lib) package.

Runs on Linux, Window and MacOSX

![Network diagram](screenshot.png)

### Functionalities
- Generating a new wallet (works offline)
- Checking the balance of an existing wallet
- Making a payment from your existing wallet to another

### Installation
1. Make sure you have the current [Node LTS](https://nodejs.org/en/) release (or higher) installed on your system
2. Run `npm install -g ripple-wallet-cli` to install as a global dependency
3. Run `ripple-wallet-cli` to use

---

### Usage:

#### Generating a new wallet

Pull the internet cord of your computer (or disable wifi) and run the following command:

`$ ripple-wallet-cli generate`

#### Checking the balance of an existing wallet

To check the balance on your wallet, run:

`$ ripple-wallet-cli balance`

You'll be asked for the public address to check, or you can provide it directly on the command line:

`$ ripple-wallet-cli balance rJysCK99GqUBmgB54mcV7NwxYH29NRs1QQ`

The output will also show the last 10 transactions.
To see more transactions, you can up the limit:

`$ ripple-wallet-cli balance rJysCK99GqUBmgB54mcV7NwxYH29NRs1QQ --limit [number]`

#### Making a payment from your existing wallet to another

To make a payment from a wallet you control to another address, run:

`$ ripple-wallet-cli pay`

You'll be asked for the XRP amount to send, the destination address, the destination tag (optional), the sender address and finally the sender secret.

Alternatively, you can provide these params on the command line:

`$ ripple-wallet-cli pay --amount [amount] --to [destination address] --tag [destination tag]`


### ISC License

Copyright (c) 2018, Filidor Wiese

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
