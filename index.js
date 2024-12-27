console.clear();
require('dotenv').config();

const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
  TransferTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenAssociateTransaction
} = require("@hashgraph/sdk")

const supplyKey = PrivateKey.generateECDSA();

async function createFungibleToken() {
  // STEP 1: Set up environment variables and creates a testnet client with account as the operator account.
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
  console.log("\nConection to portal account made succesfully!");


  // Create new keys
  const newAccountPrivateKey = PrivateKey.generateED25519();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  if (!newAccountPrivateKey || !newAccountPublicKey) {
    throw new Error("New keys are null");
  } else {
    console.log("\nNew Keys made succesfully!");
    console.log(`newAccountPrivateKey = ${newAccountPrivateKey}`);
    console.log(`newAccountPublicKey = ${newAccountPublicKey}`);
  }

  // Create a new account with 1,000 tinybar starting balance
  const newAccount = await new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(Hbar.fromTinybars(1000))
    .execute(client);

  if (!newAccount) {
    throw new Error("New account is null");
  } else {
    console.log("\nNew account made succesfully!");
    console.log(`newAccount = ${newAccount}`);
  }

  // Get the new Account ID
  const getReceipt = await newAccount.getReceipt(client);
  const newAccountId = getReceipt.accountId;
  console.log("\nNew account ID: " + newAccountId);

  // Verify the Account balance
  const accountBalance = await new AccountBalanceQuery()
    .setAccountId(newAccountId)
    .execute(client);
  console.log("The new account balance is: " + accountBalance.hbars.toTinybars() + " tinybar.");

  // Create a New Fungible Token (Stablecoin)
  let tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName("USD Bar")
    .setTokenSymbol("USDB")
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(2)
    .setInitialSupply(10000)
    .setTreasuryAccountId(myAccountId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setSupplyKey(supplyKey)
    .freezeWith(client);

  // Sign with treasury key
  let tokenCreateSign = await tokenCreateTx.sign(PrivateKey.fromString(myPrivateKey));
  // Submit the transaction
  let tokenCreateSubmit = await tokenCreateSign.execute(client);
  // Get the transaction receipt
  let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
  // Get the token ID
  let tokenId = await tokenCreateRx.tokenId;

  // log the token in the console
  console.log(`\n--> Created Token with ID: ${tokenId}`);

  const transaction = await new TokenAssociateTransaction()
    .setAccountId(newAccountId)
    .setTokenIds([tokenId])
    .freezeWith(client);

  const signTx = await transaction.sign(newAccountPrivateKey);

  const txResponse = await signTx.execute(client);

  const associationReceipt = await txResponse.getReceipt(client);

  const transactionStatus = associationReceipt.status;

  console.log("Transaction of association was: " + transactionStatus);

  //BALANCE CHECK BEFORE TRANSFERT
	var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
	console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
	var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
	console.log(`- New's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);


  // Transfert the Fungible Token to the New Accoount
  const transferTransaction = await new TransferTransaction()
    .addTokenTransfer(tokenId, myAccountId, -10)
    .addTokenTransfer(tokenId, newAccountId, 10)
    .freezeWith(client);

  const signTransferTx = await transferTransaction.sign(PrivateKey.fromString(myPrivateKey));

  const transfertTxResponse = await signTransferTx.execute(client);

  const transferReceipt = await transfertTxResponse.getReceipt(client);

  const transferStatus = await transferReceipt.status;

  console.log("The status of the token transfert is: " + transferStatus);

  //BALANCE CHECK AFTER TRANSFER
	var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
	console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
	var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
	console.log(`- New's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
}
createFungibleToken();