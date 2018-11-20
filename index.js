var Api = require("@kokosapiens/api");
var Wallet = require("@kokosapiens/wallet");
var _ = require("lodash");
var BigNumber = require("bignumber.js");

var assetsDecs = {eth: 1e18,
                  lsk: 1e8,
                  doge: 1e8,
                  btc: 1e8};

function toBits(asset, amount){
    return (new BigNumber(amount)).multipliedBy(assetsDecs[asset]).integerValue().toString();
}
function toUnit(asset, amount){
    return (new BigNumber(amount)).dividedBy(assetsDecs[asset]).toFixed(8)
}



function convert(scope, fromAsset, fromAssetVolume,
                 toAsset, toAssetVolume, position){
    return new Promise(function(resolve, reject){
        if(typeof(position) == "undefined"
           || position == null){
            position = 0;
        }
        
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
                         balance: toBits(asset, w.total),
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
                var bn = new BigNumber(b);
                if(!bn.isGreaterThan(amount)){
                    return reject({error: "Not Enough Balance"});
                }
                scope.wallet.sendFromPosition(asset, position,
                                              toBits(asset, amount),
                                              toAddress, 0, 0, b.address)
                    .then(function(r){
                        resolve({asset: asset,
                                 from: b.address,
                                 fromPosition: position,
                                 amount: amount,
                                 to: toAddress});
                    }).catch(reject);
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
        scope.wallet = Wallet.start(scope.account,
                                    config.wallet.network);
        scope.api.pairs()
            .then(function(pairs){
                scope.cache.conversionMap = {};
                for(var pairSymbol in pairs){
                    var pair = pairs[pairSymbol];
                    if(typeof(scope.cache.conversionMap[pair.base_asset]) == "undefined"){
                        scope.cache.conversionMap[pair.base_asset] = {};
                    }
                    if(typeof(scope.cache.conversionMap[pair.quote_asset]) == "undefined"){
                        scope.cache.conversionMap[pair.quote_asset] = {};
                    }

                    scope.cache.conversionMap[pair.base_asset][pair.quote_asset] = {side: "ask",
                                                                                    pair: pairSymbol};
                    scope.cache.conversionMap[pair.quote_asset][pair.base_asset] = {side: "bid",
                                                                                    pair: pairSymbol};
                    
                    
                }
                scope.cache.pairs = pairs;
                resolve({convert: _.partial(convert, scope),
                         balance: _.partial(balance, scope)});
            }).catch(reject);
    });
}

module.exports = define;
