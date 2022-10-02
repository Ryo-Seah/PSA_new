import algosdk from 'algosdk'
var sha256 = require('sha256');

const keypress = async () => {
    process.stdin.setRawMode(true)
    return new Promise<void>(resolve => process.stdin.once('data', () => {
        process.stdin.setRawMode(false)
        resolve()
    }))
}
// createAccount
// once created sucessfully, you will need to add funds 
// The Algorand TestNet Dispenser is located here: 
// https://dispenser.testnet.aws.algodev.network/

// const DISPENSERACCOUNT = "HZ57J3K46JIJXILONBBZOHX6BKPXEM2VVXNRFSUED6DKFD5ZD24PMJ3MVA";
async function createAsset(algodClient: algosdk.Algodv2, userAccount: algosdk.Account | undefined, metadatafile: JSON, pon_id: string | undefined): Promise<any>{
    console.log("");
    console.log("==> CREATE ASSET");
    //Check account balance 
    if(userAccount == null){
        return "Invalid wallet account."
    }
    const accountInfo = await algodClient.accountInformation(userAccount.addr).do();
    const startingAmount = accountInfo.amount;
    console.log("Your account balance: %d microAlgos", startingAmount);

    // Construct the transaction
    const params = await algodClient.getTransactionParams().do();
    const defaultFrozen = false;
    // Used to display asset units to user    
    const unitName = pon_id; // E PON ID
    // Friendly name of the asset    
    const assetName = "PSA_E-PON:" + {unitName}; 

    //manager account can destroy asset
    const managerAddr = userAccount.addr; // OPTIONAL: FOR DEMO ONLY, USED TO DESTROY ASSET WITHIN
    //const managerAddr = undefined; 
    // Specified address is considered the asset reserve
    // (it has no special privileges, this is only informational)
    const reserveAddr = undefined; 
    // Specified address can freeze or unfreeze user asset holdings   
    const freezeAddr = undefined;
    // Specified address can revoke user asset holdings and send 
    // them to other addresses    
    const clawbackAddr = undefined;
    
    // Use actual total  > 1 to create a Fungible Token
    // example 1:(fungible Tokens)
    // totalIssuance = 10, decimals = 0, result is 10 total actual 
    // example 2: (fractional NFT, each is 0.1)
    // totalIssuance = 10, decimals = 1, result is 1.0 total actual
    // example 3: (NFT)
    // totalIssuance = 1, decimals = 0, result is 1 total actual 
    // integer number of decimals for asset unit calculation
    const decimals = 0; 
    const total = 1; // how many of this asset there will be

    //this for generating metadatahash on site
    const fullPath =  __dirname + '/documents/metadata.json'; 
  
    // const metadatafile = (await fs.readFileSync(fullPath)); 
    // const hash = crypto.createHash('sha256');
    // hash.update(metadatafile);

    // const metadata = new Uint8Array(hash.digest());

    const hash = sha256(JSON.stringify(metadatafile));
    //need to truncate to 32 char
    const trimmed = hash.substring(0, 32);
    console.log(trimmed)



    // signing and sending "txn" allows "addr" to create an asset 
    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        from: userAccount.addr,
        total,
        decimals,
        assetName,
        unitName,
        assetMetadataHash: trimmed,
        defaultFrozen,
        freeze: freezeAddr,
        manager: managerAddr,
        clawback: clawbackAddr,
        reserve: reserveAddr,
        suggestedParams: params,});


        const rawSignedTxn = txn.signTxn(userAccount.sk);

        let signed = []
        signed.push( rawSignedTxn )
      

        let tx = (await algodClient.sendRawTransaction(signed).do());
        
        let assetID = null;
        // Wait for transaction to be confirmed
        const confirmedTxn = await waitForConfirmation(algodClient, tx.txId, 4)
        //Get the completed Transaction
        console.log("Transaction " + tx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
        const ptx = await algodClient.pendingTransactionInformation(tx.txId).do();
        assetID = ptx["asset-index"];
        // console.log("AssetID = " + assetID);
       

    return { assetID };
 
 
}

const createAccount = function () :algosdk.Account | undefined {
    try {

        let account_mnemonic = "plunge mass common have laptop delay exile army lesson vibrant grief tube twenty lady cheese surround silk exercise stumble census taxi shock foster abandon detect"
        let myaccount = algosdk.mnemonicToSecretKey(account_mnemonic);
        console.log("Account Address = " + myaccount.addr);
        console.log("Account Mnemonic = " + account_mnemonic);
        console.log("Ensure account has sufficient algos.");

        return myaccount;
    }
    catch (err) {
        console.log("err", err);
        return undefined
    }
};


/**
 * Wait until the transaction is confirmed or rejected, or until 'timeout'
 * number of rounds have passed.
 * @param {algosdk.Algodv2} algodClient the Algod V2 client
 * @param {string} txId the transaction ID to wait for
 * @param {number} timeout maximum number of rounds to wait
 * @return {Promise<*>} pending transaction information
 * @throws Throws an error if the transaction is not confirmed or rejected in the next timeout rounds
 */
const waitForConfirmation = async function (algodClient: algosdk.Algodv2, txId: string | null, timeout: string | number) {
    if (algodClient == null || txId == null || timeout < 0) {
        throw new Error("Bad arguments");
    }

    const status = (await algodClient.status().do());
    if (status === undefined) {
        throw new Error("Unable to get node status");
    }

    const startround = status["last-round"] + 1;
    let currentround = startround;

    while (currentround < (startround + timeout)) {
        const pendingInfo = await algodClient.pendingTransactionInformation(txId).do();
        if (pendingInfo !== undefined) {
            if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
                //Got the completed Transaction
                return pendingInfo;
            } else {
                if (pendingInfo["pool-error"] != null && pendingInfo["pool-error"].length > 0) {
                    // If there was a pool error, then the transaction has been rejected!
                    throw new Error("Transaction " + txId + " rejected - pool error: " + pendingInfo["pool-error"]);
                }
            }
        }
        await algodClient.statusAfterBlock(currentround).do();
        currentround++;
    }
    throw new Error("Transaction " + txId + " not confirmed after " + timeout + " rounds!");
};
// Function used to print created asset for account and assetid
export const check_authenticity = async function ( metadatafile: JSON, asset_id: string ) {
    // note: if you have an indexer instance available it is easier to just use this
    //     let accountInfo = await indexerClient.searchAccounts()
    //    .assetID(assetIndex).do();
    // and in the loop below use this to extract the asset for a particular account
    // accountInfo['accounts'][idx][account]);
    const account = 'F46HKJEGDFSZGPE4LIPZCFY7VABLSJRL3J3F7MDGJDTEKZKKSOQHYEDQVI';
    const algodToken = '2f3203f21e738a1de6110eba6984f9d03e5a95d7a577b34616854064cf2c0e7b';
    const algodServer = 'https://academy-algod.dev.aws.algodev.network';
    const algodPort = 443;

    let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
    let accountInfo = await algodClient.accountInformation(account).do();
    for (let idx = 0; idx < accountInfo['created-assets'].length; idx++) {
        let scrutinizedAsset = accountInfo['created-assets'][idx];
        if (scrutinizedAsset['index'] == asset_id) {
            console.log("AssetID = " + scrutinizedAsset['index']);
            let myparms = JSON.stringify(scrutinizedAsset['params'], undefined, 2);
            console.log("parms = " + myparms);
            const hash = sha256(JSON.stringify(metadatafile));
            //need to truncate to 32 char
            const trimmed = hash.substring(0, 32);
            const b64_trim = Buffer.from(trimmed).toString("base64");
            console.log(b64_trim);
            const original = myparms
            const obj = JSON.parse(original)
            return (obj['metadata-hash']=== b64_trim);
        }
    }
};
// // Function used to print asset holding for account and assetid
// export const printAssetHolding = async function (algodClient: algosdk.Algodv2, account: string, assetid: any) {
//     // note: if you have an indexer instance available it is easier to just use this
//     //     let accountInfo = await indexerClient.searchAccounts()
//     //    .assetID(assetIndex).do();
//     // and in the loop below use this to extract the asset for a particular account
//     // accountInfo['accounts'][idx][account]);
    
//     let accountInfo = await algodClient.accountInformation(account).do();
//     for (let idx = 0; idx < accountInfo['assets'].length; idx++) {
//         let scrutinizedAsset = accountInfo['assets'][idx];
//         if (scrutinizedAsset['asset-id'] == assetid) {
//             let myassetholding = JSON.stringify(scrutinizedAsset, undefined, 2);
//             console.log("assetholdinginfo = " + myassetholding);
//             break;
//         }
//     }
// };


export async function createNFT(metadata:JSON, pon_number:string) {

    try {
        let walletAccount = createAccount();
        // Connect your client
        // const algodToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        // const algodServer = 'http://localhost';
        // const algodPort = 4001;
        const algodToken = '2f3203f21e738a1de6110eba6984f9d03e5a95d7a577b34616854064cf2c0e7b';
        const algodServer = 'https://academy-algod.dev.aws.algodev.network';
        const algodPort = 443;

        let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

        // CREATE ASSET
        const all = await createAsset(algodClient, walletAccount, metadata, pon_number);
        console.log(all)
        console.log("assetID: " + all.assetID)
        // DESTROY ASSET
        // await destroyAsset(algodClient, walletAccount, assetID); 
        // CLOSEOUT ALGOS - Alice closes out Alogs to dispenser
        // await closeoutAliceAlgos(algodClient, walletAccount);
        return all
        

    }
    catch (err) {
        console.log("err", err);
        return err
    }
      process.exit();
};



// createNFT("sha-whatever", "12345678");
// printCreatedAsset('114015977')