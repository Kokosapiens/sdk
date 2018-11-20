var Api = require("@kokosapiens/api");
var Wallet = require("@kokosapiens/wallet");
var _ = require("lodash");
var cache = {};
function convert(scope, fromAsset, fromAssetVolume,
                 toAsset, toAssetVolume){


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
    var scope = {};
    scope.api = Api(config.api);
    scope.account = Wallet.createAccount(config.wallet.passphrase);
    scope.wallet = Wallet.start(config.wallet.passphrase);
    scope.api.pairs()
        .then(function(pairs){
            console.log(pairs);
            cache.pairs = pairs;
        }).catch(function(){

        });
    return {convert: _.partial(convert, scope),
            balance: _.partial(balance, scope)};
}

module.exports = define;
