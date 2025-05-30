import React, { useCallback, useEffect, useState, useMemo } from "react";
import { ed25519 } from "@noble/curves/ed25519";
// import * as ed25519 from "@noble/ed25519";
import axios from 'axios';
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  SendTransactionError,
} from "@solana/web3.js";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

const endpoint = "https://api.devnet.solana.com";

const darkTheme = {
  backgroundColor: "#121212",
  color: "#ffffff",
  cardBackground: "#1e1e1e",
  inputBackground: "#2d2d2d",
  buttonPrimary: "#9945FF",
  buttonDanger: "#FF3E3E",
  buttonText: "#ffffff",
  borderColor: "#333333",
  successColor: "#4CAF50",
  errorColor: "#F44336",
  linkColor: "#BB86FC",
};

function Swapper() {
  const [amount, setAmount] = useState("");
  const [fromToken, setFromToken] = useState("");
  const [toToken, setToToken] = useState("");
  const [quoteResult, setQuoteResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getQuote = async () => {
    if (!amount) {
      setError("Please fill in amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`https://quote-api.jup.ag/v6/quote`, {
        params: {
          inputMint: "So11111111111111111111111111111111111111112",
          outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          amount: Math.round(Number(amount) * 1000000000).toString(),
          slippageBps: 50
        },
        headers: { 
          'Accept': 'application/json'
        }
      });

      setQuoteResult(Number(response.data.swapUsdValue));
    } catch (error) {
      setError(error.response?.data?.message || error.message || "Failed to get quote");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "20px 0" }}>
      <h2 style={{ color: darkTheme.color }}>Jupiter Swap Quote</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount in SOL"
          style={{
            padding: "8px",
            backgroundColor: darkTheme.inputBackground,
            color: darkTheme.color,
            border: `1px solid ${darkTheme.borderColor}`,
            borderRadius: "4px"
          }}
        />
        <input
          type="string"
          id="toToken"
          placeholder="to mint address"
          style={{
            padding: "8px",
            backgroundColor: darkTheme.inputBackground,
            color: darkTheme.color,
            border: `1px solid ${darkTheme.borderColor}`,
            borderRadius: "4px"
          }}
        />
        <input
          type="string"
          id="toToken"
          placeholder="to mint address"
          style={{
            padding: "8px",
            backgroundColor: darkTheme.inputBackground,
            color: darkTheme.color,
            border: `1px solid ${darkTheme.borderColor}`,
            borderRadius: "4px"
          }}
        />
        <button
          onClick={getQuote}
          disabled={loading}
          style={{
            padding: "8px 16px",
            backgroundColor: darkTheme.buttonPrimary,
            color: darkTheme.buttonText,
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          {loading ? "Getting Quote..." : "Get SOL to USDC Quote"}
        </button>
      </div>

      {error && (
        <p style={{ color: darkTheme.errorColor, marginTop: "10px" }}>
          {error}
        </p>
      )}

      {quoteResult && (
        <div style={{ 
          marginTop: "20px",
          padding: "15px",
          backgroundColor: darkTheme.cardBackground,
          borderRadius: "4px",
          border: `1px solid ${darkTheme.borderColor}`
        }}>
          <h2 style={{ color: darkTheme.color, marginBottom: "10px" }}>Quote</h2>
          <pre style={{ 
            color: darkTheme.color,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all"
          }}>
            {JSON.stringify(quoteResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function AirdropSection() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err) {
      setError("Failed to fetch balance");
      console.error(err);
    }
  }, [connection, publicKey]);

  const requestAirdrop = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }

    const amountInput = document.getElementById("amount");
    const amount = parseFloat(amountInput.value);

    if (isNaN(amount) || amount <= 0) {
      alert("Please enter valid amount > 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );

      await connection.confirmTransaction(signature, "finalized");
      await getBalance();
      alert(`✅ Airdropped ${amount} SOL!`);
    } catch (err) {
      setError("Airdrop failed: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBalance();
  }, [publicKey, getBalance]);

  return (
    <div style={{ margin: "20px 0" }}>
      <h2 style={{ color: darkTheme.color }}>
        Balance: {balance !== null ? `${balance.toFixed(2)} SOL` : "N/A"}
      </h2>
      <div style={{ margin: "10px 0" }}>
        <input
          id="amount"
          type="number"
          placeholder="Amount"
          step="0.1"
          min="0"
          style={{
            padding: "8px",
            marginRight: "10px",
            backgroundColor: darkTheme.inputBackground,
            color: darkTheme.color,
            border: `1px solid ${darkTheme.borderColor}`,
            borderRadius: "4px"
          }}
        />
        <button
          onClick={requestAirdrop}
          disabled={loading || !publicKey}
          style={{
            padding: "8px 16px",
            backgroundColor: darkTheme.buttonPrimary,
            color: darkTheme.buttonText,
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          {loading ? "Processing..." : "Request Airdrop"}
        </button>
      </div>
      {error && <p style={{ color: darkTheme.errorColor }}>{error}</p>}
    </div>
  );
}

function Sender() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [toAddress, setToAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    if (!publicKey) {
      alert("Please connect your wallet.");
      return;
    }

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }

    let toPubkey;
    try {
      toPubkey = new PublicKey(toAddress);
    } catch (err) {
      alert("Invalid recipient address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Get fresh blockhash and last valid block height
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      
      // Step 2: Create transaction with all required parameters
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: toPubkey,
          lamports: Math.round(amount * LAMPORTS_PER_SOL),
        })
      );

      // Step 3: Send transaction (wallet will sign it)
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction submitted:', signature);

      // Step 4: Implement robust confirmation with retries
      const result = await confirmTransactionWithRetry(
        connection,
        signature,
        blockhash,
        lastValidBlockHeight
      );

      if (result === 'success') {
        alert(`✅ Success! Transaction signature: ${signature}`);
      } else {
        throw new Error('Transaction confirmation timed out');
      }
    } catch (err) {
      let errorMessage = 'Transaction failed';
      if (err instanceof SendTransactionError) {
        errorMessage = [
          `Error: ${err.message}`,
          `Logs: ${err.logs?.join('\n') || 'No logs available'}`
        ].join('\n');
      }
      
      setError(errorMessage);
      console.error('Transaction error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function for robust confirmation with retries
  async function confirmTransactionWithRetry(
    connection,
    signature,
    blockhash,
    lastValidBlockHeight,
    timeout = 60000, // 60 seconds timeout
    retryInterval = 2000 // 2 seconds between retries
  ) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');

        if (confirmation.value.err) {
          throw new Error('Transaction failed');
        }
        
        return 'success';
      } catch (err) {
        // If blockhash expired, get a new one and try again
        if (err.message.includes('Blockhash not found') || 
            err.message.includes('blockhash expired')) {
          console.log('Blockhash expired, getting new one...');
          const newBlockData = await connection.getLatestBlockhash('confirmed');
          blockhash = newBlockData.blockhash;
          lastValidBlockHeight = newBlockData.lastValidBlockHeight;
        } else {
          throw err;
        }
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
    
    return 'timeout';
  }

  return (
    <div style={{ margin: "20px 0" }}>
      <div style={{ margin: "10px 0" }}>
        <input
          type="text"
          placeholder="Recipient Address"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          style={{
            padding: "8px",
            margin: "5px 0",
            width: "100%",
            backgroundColor: darkTheme.inputBackground,
            color: darkTheme.color,
            border: `1px solid ${darkTheme.borderColor}`,
            borderRadius: "4px",
          }}
        />
        <input
          type="number"
          placeholder="Amount in SOL"
          step="0.1"
          min="0"
          value={sendAmount}
          onChange={(e) => setSendAmount(e.target.value)}
          style={{
            padding: "8px",
            margin: "5px 0",
            width: "100%",
            backgroundColor: darkTheme.inputBackground,
            color: darkTheme.color,
            border: `1px solid ${darkTheme.borderColor}`,
            borderRadius: "4px",
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !publicKey}
          style={{
            padding: "8px 16px",
            backgroundColor: darkTheme.buttonPrimary,
            color: darkTheme.buttonText,
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          {loading ? "Sending..." : "Send SOL"}
        </button>
      </div>
      {error && <p style={{ color: darkTheme.errorColor }}>{error}</p>}
    </div>
  );
}

function MessageSigner() {
  const { publicKey, signMessage } = useWallet();
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignMessage = async () => {
    if (!publicKey) {
      alert("Connect wallet first");
      return;
    }

    if (!message.trim()) {
      alert("Enter message to sign");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const messageBytes = new TextEncoder().encode(message);
      const sig = await signMessage(messageBytes);

      const isValid = ed25519.verify(sig, messageBytes, publicKey.toBytes());
      if (!isValid) throw new Error("Message signature invalid");
      if(isValid)
      {
        alert('success');
      }


      setSignature(Buffer.from(sig).toString("hex"));
    } catch (err) {
      setError("Signing failed: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "20px 0" }}>
      <h2 style={{ color: darkTheme.color }}>Sign Message</h2>
      <div style={{ margin: "10px 0" }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message to sign"
          style={{
            padding: "8px",
            marginRight: "10px",
            width: "100%",
            minHeight: "100px",
            backgroundColor: darkTheme.inputBackground,
            color: darkTheme.color,
            border: `1px solid ${darkTheme.borderColor}`,
            borderRadius: "4px"
          }}
        />
      </div>
      <button
        onClick={handleSignMessage}
        disabled={loading || !publicKey}
        style={{
          padding: "10px 20px",
          backgroundColor: darkTheme.buttonPrimary,
          color: darkTheme.buttonText,
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        {loading ? "Signing..." : "Sign Message"}
      </button>
      {signature && (
        <div style={{ marginTop: "10px" }}>
          <h3 style={{ color: darkTheme.color }}>Signature:</h3>
          <div style={{
            wordBreak: "break-all",
            backgroundColor: darkTheme.cardBackground,
            padding: "10px",
            borderRadius: "5px",
            color: darkTheme.color
          }}>
            {signature}
          </div>
        </div>
      )}
      {error && <p style={{ color: darkTheme.errorColor }}>{error}</p>}
    </div>
  );
}

function App() {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "20px",
            fontFamily: "Arial, sans-serif",
            backgroundColor: darkTheme.backgroundColor,
            color: darkTheme.color,
            minHeight: "100vh"
          }}>
            <h1 style={{ color: darkTheme.linkColor }}>Solana Wallet Adapter</h1>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "30px",
              gap: "10px",
              flexWrap: "wrap"
            }}>
              <WalletMultiButton style={{
                backgroundColor: darkTheme.buttonPrimary,
                color: darkTheme.buttonText,
                borderRadius: "5px",
                padding: "10px 20px",
                height: "auto"
              }} />
              <WalletDisconnectButton style={{
                backgroundColor: darkTheme.buttonDanger,
                color: darkTheme.buttonText,
                borderRadius: "5px",
                padding: "10px 20px",
                height: "auto"
              }} />
            </div>
            
            <div style={{
              backgroundColor: darkTheme.cardBackground,
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: `1px solid ${darkTheme.borderColor}`
            }}>
              <h2 style={{ color: darkTheme.linkColor }}>Airdrop SOL (Devnet)</h2>
              <AirdropSection />
            </div>
            
            <div style={{
              backgroundColor: darkTheme.cardBackground,
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: `1px solid ${darkTheme.borderColor}`
            }}>
              <h2 style={{ color: darkTheme.linkColor }}>Transfer SOL</h2>
              <Sender />
            </div>

            <div style={{
              backgroundColor: darkTheme.cardBackground,
              padding: "20px",
              borderRadius: "8px",
              border: `1px solid ${darkTheme.borderColor}`
            }}>
              <MessageSigner />
            </div>

            <div style={{
              backgroundColor: darkTheme.cardBackground,
              padding: "20px",
              borderRadius: "8px",
              border: `1px solid ${darkTheme.borderColor}`
            }}>
              <Swapper />
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;