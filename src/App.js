/* eslint-disable no-unused-vars */
import './App.css';
import Header from './components/header/Header';
import MyStake from './components/MyStake/MyStake';
import StakeHistory from './components/StakeHistory/StakeHistory';
import DispStake from './components/DispStake/DispStake'
import {useState, useEffect} from 'react'
import Footer from './components/Footer/Footer';
import { ethers, utils, Contract } from 'ethers';
import BRTTokenAbi from './utils/web3/abi.json'
import { formatDate } from './utils/helpers';
const BRTTokenAddress = "0x169E82570feAc981780F3C48Ee9f05CED1328e1b";

function App() {

  // a flag for keeping track of whether or not a user is connected
  const [connected, setConnected] = useState(false);

  // connected user details
  const [userInfo, setUserInfo] = useState({
    matic_balance: 0,
    token_balance: 0,
    address: null
  });
  
  
  // the amount of token the user have staked
  const [stakeAmount, setStakeAmount] = useState(null)

  // the amount of reward the user has accumulate on his stake
  const [rewardAmount, setRewardAmount] = useState(null)

  // the value of token the user wants to stake
  const [stakeInput, setStakeInput] = useState("");

  // the value of token the user wants to withdraw
  const [withdrawInput, setWithdrawInput] = useState("");

  const [checkStakeInput, setcheckStakeInput] = useState("");

  // all stake history data displayed on the history table
  const [stateHistory, setStakeHistory] = useState([]);

  const [checkStakeHistory, setCheckState] = useState([]);

  const getTotalStake = async () => {
    // get the stake of a user to check total stake;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const BRTContractInstance = new Contract(BRTTokenAddress, BRTTokenAbi, signer);
    const myStakeTx = await  BRTContractInstance.myStake();
    setStakeAmount(utils.formatUnits(myStakeTx.stakeAmount, 18));

    // calculation of user reward based on time start;
    const lastestStake = formatDate(myStakeTx.time.toString());
    const newStakeTime = new Date(lastestStake);
    const stakeSeconds = Math.floor(newStakeTime.getTime() / 1000);

    // getting the current day in seconds
    const currentDay = new Date();
    const currentDaySeconds = Math.floor(currentDay.getTime() / 1000);

    // getting the difference between the lastest stake and the current day
    const timeDifference = currentDaySeconds - stakeSeconds;

    // showing reward after 3 days otherwise showing 0
    if (timeDifference >= 20) {
      const reward = 0.0000000386 * timeDifference * myStakeTx.stakeAmount/ Math.pow(10,18);
      setRewardAmount(reward.toFixed(2));
    } else setRewardAmount("0.0");
  }

  // helper function for getting the matic and token balance, given an address
  const getAccountDetails = async (address) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const userMaticBal = await provider.getBalance(address);
      const BRTContractInstance = new Contract(BRTTokenAddress, BRTTokenAbi, provider);
      const userBRTBalance = await BRTContractInstance.balanceOf(address)
      await getTotalStake();

      return {userBRTBalance, userMaticBal}
    }catch(err) {
      console.log(err)
    }
  }

  // handler for when user switch from one account to another or completely disconnected
  const handleAccountChanged = async (accounts) => {
    if(!!accounts.length) {
      const networkId = await window.ethereum.request({method: "eth_chainId"})
      if(Number(networkId) !== 80001) return
      const accountDetails = await getAccountDetails(accounts[0])

      setUserInfo({
        matic_balance: accountDetails.userMaticBal,
        token_balance: accountDetails.userBRTBalance,
        address: accounts[0]
      })
      setConnected(true)

    }else {
      setConnected(false)
      setUserInfo({
        matic_balance: 0,
        token_balance: 0,
        address: null
      })
      
    }
  }

  // handler for handling chain/network changed
  const handleChainChanged = async (chainid) => {
    if(Number(chainid) !== 80001) {
      setConnected(false)
      setUserInfo({
        matic_balance: 0,
        token_balance: 0,
        address: null
      })

      return alert("You are connected to the wrong network, please switch to polygon mumbai")
    }else {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.listAccounts();
      if(!accounts.length) return
      const accountDetails = await getAccountDetails(accounts[0])
        setUserInfo({
          matic_balance: accountDetails.userMaticBal,
          token_balance: accountDetails.userBRTBalance,
          address: accounts[0]
        })
        setConnected(true)
        await getTotalStake();

      }
  }

  // an handler to eagerly connect user and fetch their data
  const eagerConnect = async () => {
    const networkId = await window.ethereum.request({method: "eth_chainId"})
    if(Number(networkId) !== 80001) return
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.listAccounts();
    if(!accounts.length) return
    const accountDetails = await getAccountDetails(accounts[0])
      setUserInfo({
        matic_balance: accountDetails.userMaticBal,
        token_balance: accountDetails.userBRTBalance,
        address: accounts[0]
      })
      setConnected(true)
      await getTotalStake();

  }

  // a function for fetching necesary data from the contract and also listening for contract event when the page loads
  const init = async () => {
    const customProvider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_RPC_URL)
    const BRTContractInstance = new Contract(BRTTokenAddress, BRTTokenAbi, customProvider);
    const stakeHistory = await BRTContractInstance.queryFilter("stakeEvent");

    const history = [];
    
    stakeHistory.forEach(data => {
      history.unshift({
        amount: data.args[1],
        account: data.args[0],
        time: data.args[2].toString(),
        type: data.args[3],
      })
    })


    setStakeHistory(history);

    BRTContractInstance.on("stakeEvent", (account, amount, time, type) => {
      const newStake = {
        amount: amount,
        account: account,
        time: time.toString(),
        type: type,
      }

      setStakeHistory(prev => [newStake, ...prev]);
    })

  }

  useEffect(() => {

    init()
    if(!window.ethereum) return;
    // binding handlers to wallet events we care about
    window.ethereum.on("connect", eagerConnect)
    window.ethereum.on("accountsChanged", handleAccountChanged)
    window.ethereum.on('chainChanged', handleChainChanged);
  }, [])
  

  const connectWallet = async () => {
    if(!!window.ethereum || !!window.web3) {
      await window.ethereum.request({method: "eth_requestAccounts"})
    } else {
      alert("please use an etherum enabled browser");
    }
  }

  // onchange handler for handling both stake and unstake input value
  const onChangeInput = ({target}) => {
    switch (target.id) {
      case "stake":
        setStakeInput(target.value)
        break;

      case "unstake":
        setWithdrawInput(target.value);
        break;
      
      case "check":
          setcheckStakeInput(target.value);
          break;
    
      default:
        break;
    }
  }


  // A function that handles staking
  const onClickStake = async (e) => {
    e.preventDefault()
    if(stakeInput < 0) return alert("you cannot stake less than 0 BRT");

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const BRTContractInstance = new Contract(BRTTokenAddress, BRTTokenAbi, signer);
    const weiValue = utils.parseEther(stakeInput);
    const stakeTx = await BRTContractInstance.stakeBRT(weiValue);
    setStakeInput("");
    // const stakeTxHash = await provider.getTransaction(stakeTx.hash)
    const response = await stakeTx.wait();
    await getTotalStake();

    const address = response.events[1].args[0]
    const amountStaked = response.events[1].args[1].toString()
    const time = response.events[1].args[2].toString()
    
  }
// A function that handles unstaking
  const onClickWithdraw = async (e) => {
    e.preventDefault();
    // checks the balance of the user before passing the input to the withdraw function
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const accounts = await provider.listAccounts();
    const BRTContractInstance = new Contract(BRTTokenAddress, BRTTokenAbi, provider);
    const userBRTBalance = await BRTContractInstance.balanceOf(accounts[0]);
    const  balanceuser = userBRTBalance.toString() / Math.pow(10,18);
    // checks if the withdrawInput is less than balanceofuser
    if (withdrawInput < balanceuser) {
      const weiValue = utils.parseEther(withdrawInput);
      const BRTContractInstance = new Contract(BRTTokenAddress, BRTTokenAbi, signer);

      const withdrawTx = await BRTContractInstance.withdraw(weiValue);

      const withdrawTxHash = await provider.getTransaction(withdrawTx.hash)
      const response = await withdrawTxHash.wait();
      await getTotalStake()
      console.log(response);    

    } alert("Insuffient Funds :(")

  }

  // A function that handles checking user stake on pass address
  const onClickCheckStake = async (e) => {
    e.preventDefault();
    // gets a provider that enable us access the blockchain even without being connected
    const customProvider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_RPC_URL)
    // this gets the instance of the already deployed contract
    const BRTContractInstance = new Contract(BRTTokenAddress, BRTTokenAbi, customProvider);
    // calls the getStakeByAddress function
    const getUsersDetails = await BRTContractInstance.getStakeByAddress(checkStakeInput);
    const userAmount = getUsersDetails.stakeAmount;
    const userAddr = getUsersDetails.staker;
    const stakedTime = getUsersDetails.time.toString();
    const validity = getUsersDetails.valid;
    let userFile = [];
    let history = []
    const obj =  {a: userAmount, b: stakedTime, c: userAddr, d: validity};
    userFile.push(obj);

    if(validity == true) {
        userFile.forEach(data => {
          history.unshift({
            amount: data.a,
            time: data.b.toString(),
            user_Addr: data.c,
            type: data.d,
          })
        })
    
        setCheckState(history);    
    } else {
      alert("Doesnt have a stake")
    }


  }

  
  return (
    <div className="App">
      <Header 
        connectWallet = {connectWallet}
        connected={connected}
        userInfo = {userInfo}
      />
      <main className='main'>
        <MyStake
          stakeInput = {stakeInput}
          withdrawInput = {withdrawInput}
          checkStakeInput = {checkStakeInput}
          onChangeInput = {onChangeInput}
          onClickStake = {onClickStake}
          onClickWithdraw = {onClickWithdraw}
          onClickCheckStake = {onClickCheckStake}
          stakeAmount = {stakeAmount}
          rewardAmount = {rewardAmount}
          connected = {connected}

        />
         <DispStake
          stakeItemData = {checkStakeHistory}
        />
        <StakeHistory
          stakeData = {stateHistory}
        />

       
      </main>
      <Footer />
    </div>
  );
}

export default App;
