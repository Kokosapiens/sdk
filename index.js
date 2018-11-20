var Api = require("@kokosapiens/api");
var Wallet = require("@kokosapiens/wallet");
var _ = require("lodash");
var BigNumber = require("bignumber.js");

var assetsDecs = {eth: 1e18,
                  lsk: 1e8,
                  doge: 1e8,
                  btc: 1e8};


function convert(scope, fromAsset, fromAssetVolume,
                 toAsset, toAssetVolume){
    return new Promise(function(resolve, reject){
      
    });

}

function balance(scope, asset, position){

    return new Promise(function(resolve, reject){
        if(typeof(position) == "undefined"
           || position == null){
            position = 0;
        }
        scope.wallet.positionBalance(asset, position)
            .then(function(w){
                resolve({address: w.address.address,
                         balance: (new BigNumber(w.total)).dividedBy(assetsDecs[w.address.symbol]).toFixed(8),
                         symbol: w.address.symbol,
                         network: w.address.network,
                         position: w.address.position});
            }).catch(reject);
    });
}


function address(scope, asset, position){
    return new Promise(function(resolve, reject){
        if(typeof(position) == "undefined"
           || position == null){
            position = 0;
        }
        balance(scope, asset, position).then(resolve).catch(reject);
    });
}

function transfer(scope, asset, amount, toAddress, position){
    return new Promise(function(resolve, reject){
        if(typeof(position) == "undefined"
           || position == null){
            position = 0;
        }
        balance(scope, asset, position)
            .then(function(b){
                
            }).catch(reject);

    });
}

function define(config){
    return new Promise(function(resolve, reject){
        var scope = {};
        scope.cache = {};
        scope.api = Api(config.api);
        scope.account = Wallet.createAccount(config.wallet.passphrase, 0, 0);
     
        scope.network = config.wallet.network;
        scope.wallet = Wallet.start(scope.account, config.wallet.network);
        scope.api.pairs()
            .then(function(pairs){
                scope.cache.pairs = pairs;
                resolve({convert: _.partial(convert, scope),
                         balance: _.partial(balance, scope)});
            }).catch(reject);
    });
}

module.exports = define;
