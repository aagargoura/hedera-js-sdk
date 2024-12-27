const { Client, PrivateKey, AccountCreateTransaction, Hbar, AccountId } = require("@hashgraph/sdk")
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

  //STEP 2: Configure client to point to local network.
  //Create your local client
  const node = { "127.0.0.1:50211": new AccountId(3) };
  const client = Client.forNetwork(node).setMirrorNetwork("127.0.0.1:5600");

  client.setOperator(AccountId.fromString("0.0.2"), PrivateKey.fromString("302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137"));


  //Submit a transaction to your local node
  const newAccount = await new AccountCreateTransaction().setKey(PrivateKey.fromString("302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137")).setInitialBalance(new Hbar(1)).execute(client);

  //Get receipt
  const receipt = await newAccount.getReceipt(client);

  //Get the account ID
  const newAccountId = receipt.accountId;
  console.log(newAccountId);
}
environmentSetup();