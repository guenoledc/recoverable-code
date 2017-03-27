var fs=require('fs-ext');

var stateFolder = process.env.PWD + "/" + ".recoverableCode";
var fdLock = 0;
if(!fs.existsSync(stateFolder)) fs.mkdirSync(stateFolder);
if(!fs.existsSync(stateFolder)) {console.log("Cannot create state folder "+stateFolder, ". Process cannot start. Check permissions!");
	process.exit(-1); }
try {
	fdLock = fs.openSync(stateFolder+"/.lock","w+");
	fs.writeSync(fdLock,"PID "+process.pid);
	fs.flockSync(fdLock, "exnb"); // will only unlock at process close. Use flockSync(fdLock, "un") to unlock if needed
	console.log("Lock created:", fdLock);
} catch(error) {
	console.log("Cannot open the", stateFolder+"/.lock", "file. Stopping the process. Check if another process is still running on the same folder. PID inside the .lock file.\n", error);
	process.exit(-1);
}

global.Recoverables={};

var execFile = function(stateFile, recovered){
    let toBeEx = fs.readFileSync(stateFile).toString(); 
    var f=new Function(toBeEx);

    var remover = {
        completed:function() {
            fs.unlinkSync(stateFile);
        },
        recovered: recovered || false
    };
    f.call(remover);
}
var RecoverableCode = function(uniqueName, code) {
    if(typeof uniqueName != "string") throw new Error("Recoverable code needs a string as first parameter to declare a recoverable code");
    if( global.Recoverables[uniqueName] ) throw new Error("You are declaring the recoverable '"+uniqueName+"' a second time. This is not permitted");
    if(typeof code != "function") throw new Error("RecoverableCode needs a function to represent the code");
    global.Recoverables[uniqueName]=code; // when restarting the function will be created in the same order 

    return function( ...state) { 
        let name = uniqueName;
        try {
            var toBeEx = "global.Recoverables['"+name+"'].call(this,"+state.map(function(p){return JSON.stringify(p);}).join(",")+");\n";
            var file="RC"+Math.random().toString().replace(".","")+"_"+Date.now()+".state";
            fs.writeFileSync(stateFolder+"/"+file, toBeEx);
            execFile(stateFolder+"/"+file, false) 
        } catch (error) {
                throw new Error("The required stated could not be saved");
        }
    };
}


// process the reloading of all saved files
var stateFiles = fs.readdirSync(stateFolder);
var stateFiles = stateFiles.filter((f) => (f.startsWith("RC") && f.endsWith(".state")) );
stateFiles.forEach(function(file){  setImmediate(function(){ execFile(stateFolder +"/"+ file, true);  }) });


module.exports = RecoverableCode;
