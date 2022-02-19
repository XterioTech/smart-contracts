const { ethers } = require("ethers");
const prompt = require("prompt");
const fs = require('fs');

prompt.get(['Private Key', 'Password'], (err, result) => {
    if (err) { 
        console.error(err);
        return;
    }
    const wallet = new ethers.Wallet(result["Private Key"])
    wallet.encrypt(result["Password"]).then(jsonWallet => {
        console.log("Encrypted JSON Wallet", jsonWallet)
        fs.writeFileSync(`wallet.json`, jsonWallet)
    })
});