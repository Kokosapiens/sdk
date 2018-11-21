# sdk

`npm install --save @kokosapiens/sdk`

### What is a @kokosapiens/wallet [https://github.com/kokosapiens/wallet]?

is a HD multicurrency wallet library.
Supported currencies: BTC, ETH, LSK, DOGE
All transactions are signed offline. Your private keys never touch the internet.

#### Wallet addresses

Position 0 is called BASE and is used as default accross the SDK
Position is a positive integer.

## How to use

```javascript
var Sdk = require("@kokosapiens/sdk");

var config = {api: {email: "your@email",
                    token: "yourtoken",
                    secret: "yourabsolutesecret"},
              wallet: {passphrase: "your hd multicurrency wallet passphrase",
                       network: "mainnet"}};

function start(sdk){

        var orderHandlers = {orderWatch: true,
                             autoCancelAfterOpenInMinutes: 60,
                             payFromPosition: 0, // will send from base address
                             receiveAtPosition: 0, // will receive at base address
                             onPaid: function(order, payment){
                                     console.log("paid");
                                     console.log(arguments);
                             },
                             onOpen: function(order){
                                     console.log("opened");
                                     console.log(order);
                             },
                             onExpiry: function(order){
                                       console.log(order);
                                       console.log("order expired");
                             },
                             onCancel: function(order){
                                       console.log("order cancelled");
                                       console.log(order);
                             },
                             onFail: function(error){
                                     console.log("order failled");
                                     console.log(error);
                             },
                             onClose: function(){
                                      console.log("order closed");
                                      console.log(arguments);
                                      }};
        sdk.buy({pair: "doge_lsk",
                 volume: 1000,
                 price: 0.001},
               orderHandlers)
            .then(function(initiatedOrder){
                console.log(initiatedOrder);
            }).catch(function(e){
                console.log(e);
                console.log("buy order failed");
            });

        sdk.sell({pair: "doge_lsk",
                  volume: 1000,
                  price: 0.002},
                 orderHandlers)
            .then(function(initiatedOrder){
                console.log(initiatedOrder);
            }).catch(function(e){
                console.log(e);
                console.log("sell order failed");
            });
        
      


}


Sdk(config).then(start).catch(console.log);
```

If you don't have a @kokosapiens/wallet account the sdk will generate one for you.
you can access it through `sdk.scope.account.passphrase`

```javascript
function createdAccount(sdk){
         console.log("your account passphrase is: "+sdk.scope.account.passphrase);
}

Sdk({wallet: {},
     api: {email: "your@email"}})
   .then(createdAccount)
   .catch(console.log);


```

To get the account addresses and balance for specific asset address at specific position

`sdk.balance("btc",295).then(doWithBTCAddressAtPosition295).catch(errorHandler)`

Get balances at position 0 for all supported currencies

```javascript
var assets = ["btc", "eth", "lsk", "doge"];
var bps = assets.map(sdk.balance);
Promise.all(bps)
.then((balancesArray)=>{
        var balances = balancesArray.reduce(function(r, b){
                              r[b.asset] = b;
                              return r;
                        },{});
        console.log(balances);
}).catch(errorHandler);
```

To get the balance of "eth" address at position N (e.g. 5) in your hd wallet

`sdk.balance("eth",5)` will return a promise that will resolve with information of the eth address at position 5

To transfer funds

`sdk.transfer("lsk", 1.0, "ALISKADDRESS")` will send 1.0 LSK to the given address. Blockchain tx fees are paid over amonut (the balance of the account must be at least 1.1 in this case where 0.1 LSK is the standard blockchain tx fee on Lisk network).

or to transfer funds from one position of hd wallet to another position
`sdk.internalTransfer(1000, "doge", 0, 12)` will send 1000 DOGE from position 0 (base wallet address) to address at position 12.

to transfer all funds between two internal addresses
`sdk.internalTransfer(null, "eth", 2, 0)` will empty position 2 address to base position address.

#### contact support@kokos.one for a Kokos API token / secret

# LICENSE
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see http://www.gnu.org/licenses/.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
