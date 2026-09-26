from web3 import Web3
import json
import os

RPC_URL = os.getenv("RPC_URL", "https://sepolia.infura.io/v3/your_infura_project_id")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000000")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "your_private_key_here")

web3 = Web3(Web3.HTTPProvider(RPC_URL))
account = web3.eth.account.from_key(PRIVATE_KEY)
SENDER = account.address

print("Connected to Sepolia:", web3.is_connected())
print("Police Account:", SENDER)


with open("abi.json") as f: 
    ABI = json.load(f)

contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)


def mint_fir():
    title = "Test FIR Title"
    description = "This is an example FIR created from Python"
    severity = 5
    ipfsHash = "QmExampleCID123456"
    metadataUri = "ipfs://QmExampleMetadata"

    nonce = web3.eth.get_transaction_count(SENDER)

    txn = contract.functions.mintFir(
        SENDER,        
        title,
        description,
        severity,
        ipfsHash,
        metadataUri
    ).build_transaction({
        "from": SENDER,
        "nonce": nonce,
        "gas": 500000,                         
        "maxFeePerGas": web3.to_wei("30", "gwei"),
        "maxPriorityFeePerGas": web3.to_wei("2", "gwei"),
        "chainId": 11155111                    
    })

    signed_txn = web3.eth.account.sign_transaction(txn, PRIVATE_KEY)

   
    tx_hash = web3.eth.send_raw_transaction(signed_txn.raw_transaction)

    print("Transaction sent:", tx_hash.hex())
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
    print("Mined in block:", receipt.blockNumber)


def get_fir(id):
    fir = contract.functions.getFirByToken(id).call()
    print("FIR data:", fir)


mint_fir()
get_fir(1)
