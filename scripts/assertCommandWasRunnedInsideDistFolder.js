const assert = require("assert");

if(__dirname.split('/dist/askless-js-client').length !== 2){
    throw "Run npm publish INSIDE the dist folder"
}else{
    console.log('Running command in the right folder')
}
