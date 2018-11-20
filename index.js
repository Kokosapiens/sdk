var Api = require("@kokosapiens/api");
var Wallet = require("@kokosapiens/wallet");
var _ = require("lodash");

function convert(scope, fromAsset, fromAssetVolume,
                 toAsset, toAssetVolume){
    return new Promise(function(resolve, reject){
        console.log(scope);
    });

}

function balance(scope, asset, position){

    return new Promise(function(resolve, reject){
        if(typeof(position) == "undefined"
           || position == null){
            position = 0;
        }
        scope.wallet.positionBalance(asset, position).then(resolve).catch(reject);
    });
}

function address(scope, asset, position){
    return new Promise(function(resolve, reject){
        if(typeof(position) == "undefined"
           || position == null){
            position = 0;
        }
        scope.wallet.positionBalance(asset, position).then(resolve).catch(reject);
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
