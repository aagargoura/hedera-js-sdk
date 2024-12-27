const { Client,PrivateKey,AccountCreateTransaction,AccountBalanceQuery,Hbar,TransferTransaction } = require("@hashgraph/sdk")
require('dotenv').config();


async function environmentSetup() {
    // STEP 1: Import already made account
    // Grab you Hedera testnet account ID and private key from your .env file
    const myAccountId = process.env.MY_ACCOUNT_ID;
    const myPrivateKey = process.env.MY_PRIVATE_KEY;
    
    // If we weren't able to grab it, we should threw a new error
    if (!myAccountId || !myPrivateKey) {
        throw new Error("Envirement variable MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present");
    } else {
        console.log(`myAccountId = ${myAccountId}`);
        console.log(`myPrivateKey = ${myPrivateKey}`);
      }

    //STEP 2: Connect to Testnet
    // Create you Hedera Testnet client
    const client = Client.forTestnet();

    // Set your account as the client's operator
    client.setOperator(myAccountId, myPrivateKey);

    // Set the default maximum transaction fee (in HBAR)
    client.setDefaultMaxTransactionFee(new Hbar(100));

    //STEP 3: Make New Account
    // Set the maximum payment for queries (in HBAR)
    client.setMaxQueryPayment(new Hbar(50));
    console.log("Conection made succesfully!");


    // Create new keys
    const newAccountPrivateKey = PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    if (!newAccountPrivateKey || !newAccountPublicKey) {
        throw new Error("New keys are null");
      } else {
        console.log("New Keys made succesfully!");
        console.log(`newAccountPrivateKey = ${newAccountPrivateKey}`);
        console.log(`newAccountPublicKey = ${newAccountPublicKey}`);
      }

    // Create a new account with 1,000 tinybar starting balance
    const newAccount = await new AccountCreateTransaction().setKey(newAccountPublicKey).setInitialBalance(Hbar.fromTinybars(1000)).execute(client);

    if (!newAccount) {
        throw new Error("New account is null");
    } else {
        console.log("New account made succesfully!");     
        console.log(`newAccount = ${newAccount}`); 
    }

    // Get the new Account ID
    const getReceipt = await newAccount.getReceipt(client);
    const newAccountId = getReceipt.accountId;
    console.log("\nNew account ID: " + newAccountId);

    // Verify the Account balance
    const accountBalance = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log("The new account balance is: " +accountBalance.hbars.toTinybars() +" tinybar.");

    //Create the transfer transaction
    const sendHbar = await new TransferTransaction().addHbarTransfer(myAccountId, Hbar.fromTinybars(-1000)).addHbarTransfer(newAccountId, Hbar.fromTinybars(1000)).execute(client);

    //Verify the transaction reached consensus
    const transactionReceipt = await sendHbar.getReceipt(client);
    console.log("The transfer transaction from my account to the new account was: " + transactionReceipt.status.toString());

    //Request the cost of the query
    const queryCost = await new AccountBalanceQuery().setAccountId(newAccountId).getCost(client);
    console.log("The cost of query is: " +queryCost);

    //Check the new account's balance
    const getNewBalance = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
    console.log("The account balance after the transfer is: " +getNewBalance.hbars.toTinybars() +" tinybar.")

    console.log("End");
    client.close();  
    return newAccountId;

}
environmentSetup();