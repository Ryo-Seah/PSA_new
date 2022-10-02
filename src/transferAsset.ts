import algosdk from 'algosdk'

 const algodToken = '2f3203f21e738a1de6110eba6984f9d03e5a95d7a577b34616854064cf2c0e7b';
 const algodServer = 'https://academy-algod.dev.aws.algodev.network';
 const algodPort = 443;

 const init = async function () : Promise<void>{
    try { 
        //#nft-test wallet
        const account_mnemonic = "plunge mass common have laptop delay exile army lesson vibrant grief tube twenty lady cheese surround silk exercise stumble census taxi shock foster abandon detect"
        const myaccount = algosdk.mnemonicToSecretKey(account_mnemonic);
        console.log("Account Address 1: " + myaccount.addr);
        console.log("Account Mnemonic 1: " + account_mnemonic);
        //"plunge mass common have laptop delay exile army lesson vibrant grief tube twenty lady cheese surround silk exercise stumble census taxi shock foster abandon detect"
        //#wallet #1 testing
        const account2_mnemonic = "tattoo vital wedding reflect kind brief item town fruit idle stage deliver radio pistol trash train print original toast image field hawk enroll abstract ceiling"
        const myaccount2 = algosdk.mnemonicToSecretKey(account2_mnemonic);
        console.log("Account Address 2: " + myaccount2.addr);
        console.log("Account Mnemonic 2: " + account2_mnemonic);

        const assetId = 66292563 //NFD_TEST token asset
        let algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);
        await printCreatedAsset(algodClient, myaccount.addr, assetId);
        await printAssetHolding(algodClient, myaccount.addr, assetId);
        
        const accAssets = await apiGetAccountAssets(myaccount2.addr)

       const hasOptIn = accAssets.some((asset) => asset.id === assetId)
       console.log('account has opt In: ' + hasOptIn)
        if (hasOptIn === false){
            ///optIn to asset
            await optIn(algodClient, myaccount2, assetId)
        }
     

        await transferAsset(algodClient,myaccount, myaccount2, assetId)

    }
    catch (err) {
        console.log("err", err);
        return undefined
    }
};

// Function used to print created asset for account and assetid
const printCreatedAsset = async function (algodClient: algosdk.Algodv2, account: string, assetid: any) {
    // note: if you have an indexer instance available it is easier to just use this
    //     let accountInfo = await indexerClient.searchAccounts()
    //    .assetID(assetIndex).do();
    // and in the loop below use this to extract the asset for a particular account
    // accountInfo['accounts'][idx][account]);
    let accountInfo = await algodClient.accountInformation(account).do();
    for (let idx = 0; idx < accountInfo['created-assets'].length; idx++) {
        let scrutinizedAsset = accountInfo['created-assets'][idx];
        if (scrutinizedAsset['index'] == assetid) {
            console.log("AssetID = " + scrutinizedAsset['index']);
            let myparms = JSON.stringify(scrutinizedAsset['params'], undefined, 2);
            console.log("parms = " + myparms);
            break;
        }
    }
};
// Function used to print asset holding for account and assetid
const printAssetHolding = async function (algodClient: algosdk.Algodv2, account: string, assetid: any) {
    // note: if you have an indexer instance available it is easier to just use this
    //     let accountInfo = await indexerClient.searchAccounts()
    //    .assetID(assetIndex).do();
    // and in the loop below use this to extract the asset for a particular account
    // accountInfo['accounts'][idx][account]);
    let accountInfo = await algodClient.accountInformation(account).do();
    for (let idx = 0; idx < accountInfo['assets'].length; idx++) {
        let scrutinizedAsset = accountInfo['assets'][idx];
        if (scrutinizedAsset['asset-id'] == assetid) {
            let myassetholding = JSON.stringify(scrutinizedAsset, undefined, 2);
            console.log("assetholdinginfo = " + myassetholding);
            break;
        }
    }
};


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

interface IAssetData {
    id: number
    amount: bigint
    creator: string
    frozen: boolean
    decimals: number
    name?: string
    unitName?: string
    url?: string
  }
async function apiGetAccountAssets(
    address: string,
  ): Promise<IAssetData[]> {
    //const mainNetClient = new algosdk.Algodv2('', 'https://algoexplorerapi.io', '')
    const testNetClient = new algosdk.Algodv2(
      '',
      'https://testnet.algoexplorerapi.io',
      '',
    )
    //https://algoindexer.testnet.algoexplorerapi.io
  
    const accountInfo = await testNetClient
      .accountInformation(address)
      .setIntDecoding(algosdk.IntDecoding.BIGINT)
      .do()
    //console.log(accountInfo)
  
    const algoBalance = accountInfo.amount as bigint
    const assetsFromRes: Array<{
      'asset-id': bigint
      amount: bigint
      creator: string
      frozen: boolean
    }> = accountInfo.assets
    //console.log(assetsFromRes)
  
    const assets: IAssetData[] = assetsFromRes.map(
      ({ 'asset-id': id, amount, creator, frozen }) => ({
        // id: Number(id),
        id: parseInt(id.toString()),
        amount,
        creator,
        frozen,
        decimals: 0,
      }),
    )
    assets.sort((a, b) => a.id - b.id)

    await Promise.all(
      assets.map(async (asset) => {
        const { params } = await testNetClient.getAssetByID(asset.id).do()
        asset.name = params.name
        asset.unitName = params['unit-name']
        asset.url = params.url
        asset.decimals = params.decimals
      }),
    )
  
    assets.unshift({
      id: 0,
      amount: algoBalance,
      creator: '',
      frozen: false,
      decimals: 6,
      name: 'Algo',
      unitName: 'Algo',
    })
    console.log(assets)
    return assets
  }

export async function optIn(algodClient: algosdk.Algodv2, account: algosdk.Account, assetId: number ) {
      ///optIn to asset
      console.log('-------------opt-in to asset---------------')
      const params = await algodClient.getTransactionParams().do();
      //comment out the next two lines to use suggested fee
      params.fee = 1000;
      params.flatFee = true;

      let sender = account.addr
      let recipient = sender;
      // We set revocationTarget to undefined as 
      // This is not a clawback operation
      let revocationTarget = undefined;
      // CloseReaminerTo is set to undefined as
      // we are not closing out an asset
      let closeRemainderTo = undefined;
      // We are sending 0 assets
      let amount = 0;
      let note = undefined
      // signing and sending "txn" allows sender to begin accepting asset specified by creator and index
      let opttxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget, amount, note, assetId, params);
      
      // Must be signed by the account wishing to opt in to the asset    
      let rawSignedTxn = opttxn.signTxn(account.sk);
      let opttx = (await algodClient.sendRawTransaction(rawSignedTxn).do())
      console.log("Transaction ID: " + opttx.txId)
      // wait for transaction to be confirmed
      await waitForConfirmation(algodClient, opttx.txId, 4)
       //You should now see the new asset listed in the account information
      console.log("Account addr = " + account.addr);
      await printAssetHolding(algodClient, account.addr, assetId);
}

export async function transferAsset(algodClient: algosdk.Algodv2, senderAcc: algosdk.Account, receiverAcc: algosdk.Account,assetId: number) {
    console.log('-------------transfer asset---------------')
        let params = await algodClient.getTransactionParams().do();
        //comment out the next two lines to use suggested fee
        params.fee = 1000;
        params.flatFee = true;

        const sender = senderAcc.addr
        const recipient =  receiverAcc.addr
        const revocationTarget = undefined;
        const closeRemainderTo = undefined;
        //Amount of the asset to transfer
        const amount = 1// nfy only 1 in supply
        const note = undefined
        // signing and sending "txn" will send "amount" assets from "sender" to "recipient"
        let xtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,
            amount,  note, assetId, params);
        // Must be signed by the account sending the asset  
        let rawSignedTxn = xtxn.signTxn(senderAcc.sk)
        let xtx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
        console.log("Transaction : " + xtx.txId);

         // wait for transaction to be confirmed
        await waitForConfirmation(algodClient, xtx.txId, 4)

        // You should now see the assets listed in the account information
        console.log("Account = " + receiverAcc.addr);
        await printAssetHolding(algodClient, receiverAcc.addr, assetId);
}

       // console.log('-------------opt-in to asset---------------')
        // const params = await algodClient.getTransactionParams().do();
        // //comment out the next two lines to use suggested fee
        // params.fee = 1000;
        // params.flatFee = true;

        // let sender = myaccount2.addr
        // let recipient = sender;
        // // We set revocationTarget to undefined as 
        // // This is not a clawback operation
        // let revocationTarget = undefined;
        // // CloseReaminerTo is set to undefined as
        // // we are not closing out an asset
        // let closeRemainderTo = undefined;
        // // We are sending 0 assets
        // let amount = 0;
        // let note = undefined
        // // signing and sending "txn" allows sender to begin accepting asset specified by creator and index
        // let opttxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget, amount, note, assetId, params);
        
        // // Must be signed by the account wishing to opt in to the asset    
        // let rawSignedTxn = opttxn.signTxn(myaccount2.sk);
        // let opttx = (await algodClient.sendRawTransaction(rawSignedTxn).do())
        // console.log("Transaction ID: " + opttx.txId)
        // // wait for transaction to be confirmed
        // await waitForConfirmation(algodClient, opttx.txId, 4)
        //  //You should now see the new asset listed in the account information
        // console.log("Account addr = " + myaccount2.addr);
        // await printAssetHolding(algodClient, myaccount2.addr, assetId);

        // Transfer New Asset:
        // Now that account can recieve the new tokens 
        // we can tranfer token in from the creator

  // console.log('-------------transfer asset---------------')
        // const params2 = await algodClient.getTransactionParams().do();
        // //comment out the next two lines to use suggested fee
        // params2.fee = 1000;
        // params2.flatFee = true;

        // const sender = myaccount.addr
        // const recipient =  myaccount2.addr
        // const revocationTarget = undefined;
        // const closeRemainderTo = undefined;
        // //Amount of the asset to transfer
        // const amount = 1// nfy only 1 in supply
        // const note = undefined
        // // signing and sending "txn" will send "amount" assets from "sender" to "recipient"
        // let xtxn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,
        //     amount,  note, assetId, params2);
        // // Must be signed by the account sending the asset  
        // let rawSignedTxn = xtxn.signTxn(myaccount.sk)
        // let xtx = (await algodClient.sendRawTransaction(rawSignedTxn).do());
        // console.log("Transaction : " + xtx.txId);

        //  // wait for transaction to be confirmed
        // await waitForConfirmation(algodClient, xtx.txId, 4)

        // // You should now see the 10 assets listed in the account information
        // console.log("Account = " + myaccount2.addr);
        // await printAssetHolding(algodClient, myaccount2.addr, assetId);

//main
init()

