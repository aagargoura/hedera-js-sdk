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
  TokenAssociateTransaction,
  TokenMintTransaction
} = require("@hashgraph/sdk")

const supplyKey = PrivateKey.generateECDSA();

//Create the NFT
async function nftCreate() {
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
  console.log("The new account balance is: " + accountBalance.hbars.toTinybars() + " tinybar.");

  /* ---------------- Create a Non-Fungible Token (NFT) ---------------- */
  //Create the NFT
  const nftCreate = await new TokenCreateTransaction()
    .setTokenName("Hedera NFT")
    .setTokenSymbol("HNFT")
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(myAccountId)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(250)
    .setSupplyKey(supplyKey)
    .freezeWith(client);

  //Log the supply Key
  console.log("- Supply Key: " + supplyKey);

  //Sign the transaction with the treasury key
  const nftCreateTxSign = await nftCreate.sign(PrivateKey.fromString(myPrivateKey));

  //Submit the transaction to a Hedera network
  const nftCreateSubmit = await nftCreateTxSign.execute(client);

  //Get the transaction receipt
  const nftCreateRx = await nftCreateSubmit.getReceipt(client);

  //Get the token ID
  const tokenId = nftCreateRx.tokenId;

  //Log the token ID
  console.log("Created NFT with Token ID: " + tokenId);

  /* ---------------- Mint a New NFT ---------------- */
  // Max transaction fee as a constant
  const maxTransactionFee = new Hbar(20);

  //IPFS content identifiers for which we will create a NFT
  const CID = [
    Buffer.from(
      "ipfs://bafyreiao6ajgsfji6qsgbqwdtjdu5gmul7tv2v3pd6kjgcw5o65b2ogst4/metadata.json"
    ),
    Buffer.from(
      "ipfs://bafyreic463uarchq4mlufp7pvfkfut7zeqsqmn3b2x3jjxwcjqx6b5pk7q/metadata.json"
    ),
    Buffer.from(
      "ipfs://bafyreihhja55q6h2rijscl3gra7a3ntiroyglz45z5wlyxdzs6kjh2dinu/metadata.json"
    ),
    Buffer.from(
      "ipfs://bafyreidb23oehkttjbff3gdi4vz7mjijcxjyxadwg32pngod4huozcwphu/metadata.json"
    ),
    Buffer.from(
      "ipfs://bafyreie7ftl6erd5etz5gscfwfiwjmht3b52cevdrf7hjwxx5ddns7zneu/metadata.json"
    )
  ];

  // MINT NEW BATCH OF NFTs
  const mintTx = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata(CID) //Batch minting - UP TO 10 NFTs in single tx
    .setMaxTransactionFee(maxTransactionFee)
    .freezeWith(client);

  //Sign the transaction with the supply key
  const mintTxSign = await mintTx.sign(supplyKey);

  //Submit the transaction to a Hedera network
  const mintTxSubmit = await mintTxSign.execute(client);

  //Get the transaction receipt
  const mintRx = await mintTxSubmit.getReceipt(client);

  //Log the serial number
  console.log("Created NFT " + tokenId + " with serial number: " + mintRx.serials);

  /* ---------------- Associate User Accounts with the NFT ---------------- */
  //Create the associate transaction and sign with New Account's key 
  const associateAccountTx = await new TokenAssociateTransaction()
    .setAccountId(newAccountId)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(newAccountPrivateKey);

  //Submit the transaction to a Hedera network
  const associateAccountTxSubmit = await associateAccountTx.execute(client);

  //Get the transaction receipt
  const associateAccountRx = await associateAccountTxSubmit.getReceipt(client);

  //Confirm the transaction was successful
  console.log(`NFT association with New Account's account: ${associateAccountRx.status}\n`);

  /* ---------------- Transfer the NFT ---------------- */
  // Check the balance before the transfer for the treasury account
  var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
  console.log(`Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);

  // Check the balance before the transfer for New Account's
  var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
  console.log(`New Account's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);

  // Transfer the NFT from treasury to New Account
  // Sign with the treasury key to authorize the transfer
  const tokenTransferTx = await new TransferTransaction()
    .addNftTransfer(tokenId, 1, myAccountId, newAccountId)
    .freezeWith(client)
    .sign(PrivateKey.fromString(myPrivateKey));

  const tokenTransferSubmit = await tokenTransferTx.execute(client);
  const tokenTransferRx = await tokenTransferSubmit.getReceipt(client);

  console.log(`\nNFT transfer from Treasury to New Account: ${tokenTransferRx.status} \n`);

  // Check the balance of the treasury account after the transfer
  var balanceCheckTx = await new AccountBalanceQuery().setAccountId(myAccountId).execute(client);
  console.log(`Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);

  // Check the balance of New account's after the transfer
  var balanceCheckTx = await new AccountBalanceQuery().setAccountId(newAccountId).execute(client);
  console.log(`New Accoun's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);


}
nftCreate();