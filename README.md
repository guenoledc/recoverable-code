# recoverable-code
When you need to make sure that a process gets completed even in case of nodejs program crash and restarts

## install
```js
npm install recoverable-code --save
```

## Explanation before you use it
Say you have a function that does some critical job and you want to ensure that it gets completed even if the process crash or get interrupted. <br>
With recoverable code, the call to your function is saved with its parameters into a file to be called again when the process restart. <br>
This implies that 
- none on the parameters are of a type that is not serializable (ie functions). Meaning that no callback are accepted.
- the context of execution only allow accessing global and closure variables at initialization time. 

In addition, be aware that because this package store its recoverable code in local files, it is made safer by not allowing a second instance of the same program to run on the same path to avoid collision of file utilisation. Therefore the package creates a .lock file in exclusive mode.

## First example
```js
var recoverable = require("recoverable-code");
// declaring a recoverable procedure with a name ("safecode") that must be unique
var safecode = recoverable("safecode", function(param){
    console.log("Executing safe code", param);
    // something take time here
    console.log("Completing safe code. Was it a recovered call:", this.recovered);
    this.completed(); // always call this to inform the recoverable that the code has terminated safely
});

// somewhere call the procedure that cannot return anything
safecode("my param");
```
output:
```
Executing safe code my param
Completing safe code. Was it a recovered call: false
```

**What this does:**
- declare a recoverable procedure and keep it in the package global variable under the name "safecode"
- calling that procedure will 
   - create a text file in a local folder ".recoverableCode" of the nodejs PWD containg a javascript calling instruction with all params JSON serialized
   - invoke that javascript text file making the call reaching the inside of the procedure and passing the saved params
   - logs the 2 lines
   - the second log displays a boolean (this.recovered) indicating whether the call was made in normal situation (false) or in recovered situation (true)
   - this.complete() will instruct that the saved file should be removed.
Should the procedure gets interrupted (exception thrown not catched, nodejs stopping, machine crash ...) the file will remain on the disk. <br>
When the program restarts and reloads the "recoverable-code" package, all files present in the folder are loaded and executed (in any particular order) passing again all saved parameters. In such cased this.recovered is true in the function.

## Second example that does not work
```js
var recoverable = require("recoverable-code");

var a_function_not_called = function() {
    // declaring a recoverable procedure with a name ("safecode") that must be unique
    var safecode = recoverable("safecode", function(param){
        console.log("Executing safe code", param);
        // something take time here
        console.log("Completing safe code");
        this.completed(); // always call this to inform the recoverable that the code has terminated safely
    });
}
// some logic here that sets in a not systematic way the flag to true
var flag = a_function_that_does_not_always_return_true();
if(flag) { 
    a_function_not_called();
    safecode("my param");
}
```
This program works if there is no crash during the procedure because it is declared before being called. However, if the procedure crashes when the program restarts there is no guarantee that the flag will be true when loading the current package and therefore the procedure may not be declared. When the saved call will be attempted to be replayed, it will not find "safecode" in the package global variable and therefore this recover will fail.<br>
Note that it can be the right approach if you are using meteor and only want to declare safe code in the server side or if you want the call to be successfull only on certain conditions.

## Third example with closure variables
The recoverable function captures the variable in its closure context like any other javascript function but it must be understood that the value of these variable depends on when the call is made.
```js
var recoverable = require("recoverable-code");
var a_package_variable = "Some texte";
// declaring a recoverable procedure with a name ("safecode") that must be unique
var safecode = recoverable("safecode", function(){
    console.log("Executing safe code", a_package_variable);
    // something take time here
    console.log("Completing safe code");
    this.completed(); // always call this to inform the recoverable that the code has terminated safely
});
// some logic here 
safecode();
a_package_variable = "text set at the end of package loading";
```
output when called without crash:
````
Executing safe code Some texte
Completing safe code
````
output when called after a crash:
````
Executing safe code text set at the end of package loading
Completing safe code
````
This is because after a crash, the saved calls are executed after the packages are completed loading where the call is done synchronously in normal processing.

## The interesting example (with callbacks)
```js
var recoverable = require("recoverable-code");

var waitResult = recoverable("wait_result", function(key){
    console.log("starting safecode");
    let self=this; // to make it available in the closure
    let intv=setInterval(function(){
        console.log("Polling for result:", key);
        if(test_if_result_is_there(key)) {
            console.log("Result is available");
            // read the result and do something;
            clearInterval(intv);
            self.completed(); // we can cancel the callback.
        }
    }, 2000);
});
// some logic here simulating how to have persistent callbacks
var key=a_function_that_work_asynchronously() // for instance asking a user response by email
waitResult(key);
```
With this structure, you are guaranteed to have your nodejs informed when the result becomes available (assuming in a separate process). <br>
The setInterval will be called again in case of resuming after a crash of the package with the key attribute restored to what it was at the time of waitResult call.
