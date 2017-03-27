var RecoverableCode = require("./index.js");


var TestFunc = function(trigger, pkhash, txs) {
    var args=Array.prototype.slice.call(arguments);
    console.log("Begining process. Recovered:",this.recovered, args, "callback in 3 sec ...", someClosure);

    setTimeout(myCallback.bind(this), 3000, trigger);
}
var myCallback = function(trigger) {
        console.log("Callback reached, completing", trigger);
        this.completed();
    };
var safepoint = RecoverableCode("safepoint", TestFunc);

var someClosure = "BEFORE CALLING";

safepoint(123456,"0x2342342342342342",["0x5555", "0x6666"]);

someClosure = "END OF PACKAGE";
