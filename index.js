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

function balance(scope, asset, position){

    return new Promise(function(resolve, reject){
        if(typeof(position) == "undefined"
           || position == null){
            position = 0;
        }
        scope.wallet.positionBalance(asset, position)
            .then(function(w){
                resolve({address: w.address.address,
                         balance: toUnit(w.address.symbol, w.total),
                         asset: w.address.symbol,
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
                var bn = new BigNumber(b.balance);
                console.log("transferamount: ", amount, b.balance);
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

function nothing(order){
    return order;
}



function rejectScope(scope, initiatedOrder, options, startedAt, prev){
    startOrderWatch(scope, initiatedOrder, options, startedAt, prev);
}

function orderWatch(scope, initiatedOrder, options, startedAt, prev){
    var now = new Date();
    scope.api.order.info({uuid: initiatedOrder.uuid})
        .then(function(order){
            console.log(order);
            var is = {opened: parseInt(order.opened) > 0,
                      closed: parseInt(order.closed) > 0,
                      expired: parseInt(order.expired) > 0};
            if(is.opened && parseInt(initiatedOrder.opened) == 0){
                options.onOpen(order, initiatedOrder);
            }
            if(is.expired){
                options.onExpiry(order);
            }else{
                if(parseInt(options.autoCancelAfterOpenInMinutes) > 0){
                    if(now.getTime() - startedAt.getTime() > parseInt(options.autoCancelAfterOpenInMinutes) * 60 * 1000){
                        scope.api.order.cancel({uuid: order.uuid})
                            .then(function(r){
                                options.onCancel(order, r);
                            })
                            .catch(function(){
                            });
                        return;
                    }
                }
                startOrderWatch(scope, order, options, startedAt, initiatedOrder);
            }
        }).catch(_.partial(rejectScope, scope, initiatedOrder, options, startedAt, prev));
}

function startOrderWatch(scope, initiatedOrder, options, startedAt, prev){
    var throttle = 15000; // check every 15 seconds;
    setTimeout(_.partial(orderWatch, scope, initiatedOrder, options, startedAt, prev), throttle);
}

/*
  options [optional]: {onInitiate, orderWatch, onOpen, onClose, onExpiry, autoCancelAfterOpenInMinutes}
  onInitiate: will be called on order successfully initiated
  onPaid: will be called after payment is sent
  orderWatch: when set to false only onInitiate and no other handler will be fired.
  onOpen: will be called when order is marked as open (deposit for order was completely received)
  onClose: will be called when order is fully executed
  onCancel: will be called when order is cancelled
  onExpiry: will be called when order is marked as expired
  onFail: will be called if payment fails
  autoCancelAfterOpenInMinutes: process must not exist during this time. order will remain open until either the order is fully executed or nothing was executed for N amount of minutes, see kokos docs. Required `orderWatch: true`
all handlers receive full order information as provided by api
*/
function placeOrder(scope, requestedOrder, options){
    return new Promise(function(resolve, reject){

        var defaultOptions = {onInitiate: nothing,
                              onPaid: nothing,
                              orderWatch: false,
                              onOpen: nothing,
                              onCancel: nothing,
                              onClose: nothing,
                              onFail: nothing,
                              onExpiry: nothing,
                              autoCancelAferOpenInMinutes: 0};
        
        options = Object.assign(defaultOptions, options)
        
        var pair = scope.cache.pairs[requestedOrder.pair];
        var side = requestedOrder.side;
        var fromAsset = side == "bid" ? pair.quote_asset : pair.base_asset;
        var toAsset = side == "ask" ? pair.quote_asset : pair.base_asset;
        var refundAt = scope.cache.addresses[fromAsset].address;
        var receiveAt = scope.cache.addresses[toAsset].address;
        var transformation = scope.cache.conversionMap[fromAsset][toAsset];
        var volume = (new BigNumber(requestedOrder.volume)).toFixed(8);
        
        var orderInfo = {volume: volume,
                         pair: transformation.pair,
                         side: transformation.side,
                         refund_address: refundAt,
                         receive_address: receiveAt};
        
        if(typeof(requestedOrder.price) != "undefined"
           && requestedOrder.price != null
           && typeof(scope.config.api.token) != "undefined"
           && typeof(scope.config.api.secret) != "undefined"){
            orderInfo.price = (new BigNumber(requestedOrder.price)).toFixed(8);
        }
        scope.api.order.initiate(orderInfo)
            .then(function(initiatedOrder){
                if(initiatedOrder.error){
                    options.onFail(initiatedOrder);
                    reject(initiatedOrder);
                    return;
                }
                options.onInitiate(initiatedOrder);
                if(options.orderWatch){
                    startOrderWatch(scope, initiatedOrder, options, new Date());
                }
                console.log(initiatedOrder);
                transfer(scope, initiatedOrder.deposit.asset,
                         initiatedOrder.deposit.deposit_amount_required,
                         initiatedOrder.deposit.address)
                    .then(function(payment){
                        options.onPaid(initiatedOrder, payment);
                    }).catch(function(e){
                        options.onFail(initiatedOrder,e);
                    });
                
                resolve(initiatedOrder);
            })
            .catch(reject);
        
    });
}

function define(config){
    return new Promise(function(resolve, reject){
        var scope = {};
        if(typeof(config.wallet.position) == "undefined"
           || config.wallet.position == null){
            config.wallet.position = 0;
        }
        scope.cache = {};
        scope.api = Api(config.api);
        scope.config = config;
        scope.account = Wallet.createAccount(config.wallet.passphrase, 0, 0);
        
        scope.network = config.wallet.network;
        scope.wallet = Wallet.start(scope.account,
                                    config.wallet.network);
        scope.api.pairs()
            .then(function(pairs){
                scope.cache.conversionMap = {};
                var addressesP = [];
                var addIdx = [];
                scope.cache.address = {};
                for(var pairSymbol in pairs){
                    var pair = pairs[pairSymbol];
                    if(typeof(scope.cache.conversionMap[pair.base_asset]) == "undefined"){
                        scope.cache.conversionMap[pair.base_asset] = {};
                        addressesP.push(balance(scope, pair.base_asset, config.wallet.position));
                    }
                    if(typeof(scope.cache.conversionMap[pair.quote_asset]) == "undefined"){
                        scope.cache.conversionMap[pair.quote_asset] = {};
                        addressesP.push(balance(scope, pair.quote_asset, config.wallet.position));
                    }

                    scope.cache.conversionMap[pair.base_asset][pair.quote_asset] = {side: "ask",
                                                                                    pair: pairSymbol};
                    scope.cache.conversionMap[pair.quote_asset][pair.base_asset] = {side: "bid",
                                                                                    pair: pairSymbol};
                    
                    
                }
                scope.cache.pairs = pairs;
                Promise.all(addressesP).then(function(addressesArr){
                    var addresses = addressesArr.reduce(function(r, a){
                        r[a.asset] = a;
                        return r;
                    },{});
                    console.log(addresses);
                    scope.cache.addresses = addresses;
                    resolve({order: _.partial(placeOrder, scope),
                             balance: _.partial(balance, scope),
                             transfer: _.partial(transfer, scope)});
                }).catch(reject);
              
            }).catch(reject);
    });
}

module.exports = define;
