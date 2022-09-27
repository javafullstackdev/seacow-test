import type { NextPage } from 'next'
import styles from '../styles/Home.module.scss'
import { useEffect, useRef, useState } from 'react'
import detectEthereumProvider from '@metamask/detect-provider';
import { notification } from 'antd';
import Web3 from 'web3';
import SeacowsPairABI from '../lib/abi/SeacowsPair/SeacowsPair.json';
import SeacowsRouterABI from '../lib/abi/SeacowsRouter/SeacowsRouter.json';
import merkleTree from '../lib/merkle-tree/index.json';

import txDecoder from 'ethereum-tx-decoder';
import axios from 'axios';
import erc20ABI from 'erc-20-abi';

import DisplayPair from '../components/DisplayPair/DisplayPair';
import objectHash from 'object-hash';
import SimpleList from '../components/SimpleList/SimpleList';


const baseURL = '/api/my-etherscan';

const testNftAddress = "0x720a1f7ae2c4f9b876852bf14089696c3ee57b1d";

const swapContractAddress = "0x927967C413c385c097259dc7a51203a027750d9d";
const poolAddress = '0x1c9f47f8c42c3a8be36dcbe3d49e365b8099c7df';

const showNot = (msg, key='error') => {
  notification.open({
    message: '',
    className: `${ styles.mynot }`,
    duration: null,
    description:
      <div className={ styles.description }>
        <i></i>
        <div>
          <p>{ msg }</p>
        </div>
      </div>,
    onClick: () => {
      console.log('Notification Clicked!');
    },
    key
  });
}

const Home: NextPage = () => {

  const accountRef = useRef(null)
	const web3Ref = useRef(null)

	const [balance, setBalance] = useState(0);
  const [readingNft, setReadingNft] = useState(false);
  const [nfts, setNfts] = useState([]);//nfts from pool
  const [minting, setMinting] = useState(false);
  const [nftsList, setNftsList] = useState(false);//my nfts list

  const [swaping, setSwaping] = useState(false);
  const [approvedList, setApprovedList] = useState([]);

  const [allPairs, setAllPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState('0x4cdf513519a328ee7537704146c5c2f5c6c439ed');

  function handleSelectedPairChange(ev){
    setSelectedPair(ev.target.value);
  }

  async function getNftMetadata(nftAddress, id){

    let { data: { result: nftABI } } = await axios.get(
      baseURL, {
      params: {
        module: 'contract',
        action: 'getabi',
        address: nftAddress,
      }
    })

    let nftContract = new web3Ref.current.eth.Contract(
      JSON.parse(nftABI),
      nftAddress
    )

    const name = await nftContract.methods.name().call()
    const tokenURI = await nftContract.methods.tokenURI(id).call()

    let { data: metadata } = await axios.get(tokenURI)

    return {
      name, tokenURI, metadata
    }

  }

  async function getABI(contractAddress){
    let { data: { result: contractABI } } = await axios.get(
      baseURL, {
      params: {
        module: 'contract',
        action: 'getabi',
        address: contractAddress,
      }
    })
    return JSON.parse(contractABI)
  }

  async function myNftsList(){

    if(!accountRef.current){
      return []
    }

    let nftABI = await getABI(testNftAddress) 
    let nftContract = new web3Ref.current.eth.Contract(
      nftABI,
      testNftAddress
    )

    let ids = await nftContract.methods.walletOfOwner(accountRef.current).call()

    let r = []
    let approvedList = []

    for(let i = 0; i < ids.length; i++){
      const id = ids[i]
      const tokenURI = await nftContract.methods.tokenURI(id).call()

      if(swapContractAddress == await nftContract.methods.getApproved(id).call()){
        approvedList.push(id)
      }

      let { data } = await axios.get(tokenURI)
      r.push({
       id, name: data.name, image: data.image
      })
    }

    setApprovedList(approvedList)

    return r;

  }

  async function getAllParsedPairs(){

    const allParsedPairs = [];

    async function getResult(poolAddress, pairABI){
      //---------------------------------------------------------------------------------------
      let poolContract = new web3Ref.current.eth.Contract(
        pairABI,
        poolAddress
      );

      let factoryAddress = await poolContract.methods.factory().call()
      console.log('factoryAddress', factoryAddress)
      let factoryABI = await getABI(factoryAddress)

      let { data: { result } } = await axios.get(
        baseURL, {
        params: {
          module: 'logs',
          action: 'getLogs',
          fromBlock: '379224',
          toBlock: 'latest',
          address: factoryAddress,
          topic0: '0xf5bdc103c3e68a20d5f97d2d46792d3fdddfa4efeb6761f8141e6a7b936ca66c'
        }
      })
      //----------------------------------------------------------------------------------------
      return result;
    }

    let result2 = await getResult(swapContractAddress, SeacowsRouterABI)
    let result1 = await getResult(poolAddress, SeacowsPairABI)

    let result = result2.concat(result1)

    for(let i = 0; i < result.length; i++){

      const parsedPair = {};

      const r = result[i]
      let pairAddress = web3Ref.current.eth.abi.decodeParameters(['address'], r.data)

      pairAddress = pairAddress[0]

      let pairContract = new web3Ref.current.eth.Contract(
        SeacowsPairABI,
        pairAddress
      );

      const poolType = await pairContract.methods.poolType().call()
      const heldIds = await pairContract.methods.getAllHeldIds().call()
      const nft = await pairContract.methods.nft().call()
      //const 

      parsedPair.address = pairAddress
      parsedPair.poolType = poolType
      parsedPair.heldIds = heldIds
      parsedPair.nft = nft

      allParsedPairs.push(parsedPair)

    }

    return allParsedPairs;

  }

  async function newSpotPrice(pairAddress, nftIds, details){

    const pairContract = new web3Ref.current.eth.Contract(
      SeacowsPairABI,
      pairAddress
    )

    try {

      const { newSpotPrice }= await pairContract.methods.getSellNFTQuote(nftIds, details).call()
      return newSpotPrice
    } catch(e) {
      return 0
    }

  }

  async function swap(nftId, selectedPair){

    const swapContract = new web3Ref.current.eth.Contract(
      SeacowsRouterABI,
      swapContractAddress
    )


    const nftIds = [nftId]

    const details = nftIds.map((_tokenId) => {
      const { group, proof } = merkleTree.tokens.find(({ tokenId }) => tokenId == _tokenId)
      return {
        groupId: parseInt(group),
        merkleProof: proof
      }
    })

    const pairAddress = selectedPair

    const _newSpotPrice = await newSpotPrice(pairAddress, nftIds, details)

    console.log("_newSpotPrice", _newSpotPrice)

    if(_newSpotPrice === 0){
      return;
    }

    const swapList = [
      {
        pair: pairAddress,
        nftIds,
        details
      }
    ]

    const minOutput = '1';
    const tokenRecipient = accountRef.current;
    const deadline = Math.ceil((new Date()).getTime() / 1000 + 3600);

    const params = [
      {
        from: accountRef.current,
        to: swapContractAddress,
        gas: '1000000',
        data: swapContract.methods.swapNFTsForToken(
          swapList,
          minOutput,
          tokenRecipient,
          deadline
        ).encodeABI(),
      },
    ];

    console.log("transaction doing ...");

    const result = await window.ethereum
      .request({
        method: 'eth_sendTransaction',
        params,
      })


  }

  async function approve(id){

    let nftABI = await getABI(testNftAddress) 

    let nftContract = new web3Ref.current.eth.Contract(
      nftABI,
      testNftAddress
    )

    const params = [
        {
              from: accountRef.current,
              to: testNftAddress,
              gas: '0x3be4c8',
              data: nftContract.methods.approve(swapContractAddress, id).encodeABI(),
            },
    ];

    const result = await window.ethereum
      .request({
        method: 'eth_sendTransaction',
        params,
      })

  }

  async function mint(nftAddress){

    let nftABI = await getABI(nftAddress) 

    let nftContract = new web3Ref.current.eth.Contract(
      nftABI,
      nftAddress
    )

    console.log("totalSupply", await nftContract.methods.totalSupply().call())
    console.log("maxSupply", await nftContract.methods.maxSupply().call())

    const params = [
        {
              from: accountRef.current,
              to: nftAddress,
              gas: '0x3be4c8',
              data: nftContract.methods.mint(accountRef.current, 1).encodeABI(),
            },
    ];

    const result = await window.ethereum
      .request({
        method: 'eth_sendTransaction',
        params,
      })

    console.log(result);

  }

  function handleMintTestNft(){
    setMinting(true)
    mint(testNftAddress)
      .then(function(){
        setMinting(false)
        myNftsList().then((_nfts) => setNftsList(_nfts))
      })
  }

  async function readNft(){

      let seacowsPairContract = new web3Ref.current.eth.Contract(
        SeacowsPairABI,
        poolAddress
      );

      let factory = await seacowsPairContract.methods.factory().call()

      console.log("factory", factory)


      let { data: { result } } = await axios.get(
        baseURL, {
        params: {
          module: 'account',
          action: 'txlist',
          address: factory,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 10,
          sort: 'desc',
        }
      })

      let { data: { result: factoryABI } } = await axios.get(
        baseURL, {
        params: {
          module: 'contract',
          action: 'getabi',
          address: factory,
        }
      })

      factoryABI = JSON.parse(factoryABI)
    
      let fnDecoder = new txDecoder.FunctionDecoder(factoryABI);

      result = result.filter(({functionName, isError}) => 
        (functionName.startsWith('createPairERC20') || functionName.startsWith('createPairETH')) && 
        isError === "0"
      )

      result.splice(2)//deletes other results otherwise takes a long time. only 2 nfts.

      let endResults = [];

      for(let i = 0; i < result.length; i++){

        let example = result[i];
        let decodedInput = fnDecoder.decodeFn(example.input);

        if(example.functionName.startsWith('createPairERC20')){

          const token = new web3Ref.current.eth.Contract(erc20ABI, decodedInput.params.token)

          
          for(let i = 0; i < decodedInput.params.initialNFTIDs.length; i++){
            const nftId = decodedInput.params.initialNFTIDs[i];
            const metadata = await getNftMetadata(decodedInput.params.nft, nftId)
            endResults.push({
              "key": objectHash(decodedInput) + "_" + nftId,
              "nftId": nftId,
              "nft": decodedInput.params.nft,
              "nftMetadata": metadata,
              "correspondingToken": {
                "symbol": await token.methods.symbol().call(),
                "name": await token.methods.name().call(),
              }
            })
          }

        }

        if(example.functionName.startsWith('createPairETH')){

          for(let i = 0; i < decodedInput._initialNFTIDs.length; i++){
            const nftId = decodedInput._initialNFTIDs[i];
            const metadata = await getNftMetadata(decodedInput._nft, nftId)
            endResults.push({
              "key": objectHash(decodedInput) + "_" + nftId,
              'nftId': nftId,
              'nft': decodedInput._nft,
              "nftMetadata": metadata,
              "correspondingToken": {
                'symbol': 'ETH',
                'name': 'Ethereum',
              }
            })
          }

        }


      }

      return endResults;
  }

  function handleReadNft(){
     setReadingNft(true);
     readNft().then((data) => {
       setNfts(data);
       setReadingNft(false);
     })
  }

	async function handleAccountsChanged(accounts) {
		if (accounts.length === 0) {
			showNot('Please connect to MetaMask.');
		} else if (accounts[0] !== accountRef.current) {
			accountRef.current = accounts[0];

			const chainId = await window.ethereum.request({ method: 'eth_chainId' });
			handleChainChanged(chainId);

			const balanceResult = await window.ethereum.request({
				method: 'eth_getBalance',
				params: [accountRef.current, 'latest']
			})
			
			let wei = parseInt(balanceResult);
			let balance = wei/(10**18);


			setBalance(balance);

      myNftsList().then((_nfts) => setNftsList(_nfts))

		}
	}

	function handleChainChanged(_chainId) {
		console.log('_chainId', _chainId)
	}



  function handleConnect(){
    window.ethereum.request({ method: 'eth_requestAccounts' })
      .then(handleAccountsChanged)
			.catch((err) => {
				if (err.code === 4001) {
					showNot('Please connect to MetaMask.');
				} else {
					console.error(err);
				}
			});
  }

  function handleApprove(id){
    approve(id)
      .then(function(){
        setApprovedList(prev => [...prev,id ])
      })
  }

  function handleSwap(){
    const nftId = approvedList[approvedList.length - 1];
    setSwaping(true)
    swap(nftId, selectedPair)
      .then(function(){
        setSwaping(false)
        setApprovedList(prev => {
          prev.pop()
          return [...prev];
        })
      })
      .catch(function(){
        setSwaping(false)
      })
  }

	useEffect(function(){

		(async function(){
			const provider = await detectEthereumProvider();
			if(provider){

        if (provider !== window.ethereum) {
          showNot('Do you have multiple wallets installed?');
        }

				web3Ref.current = new Web3(provider);

				let accounts = await window.ethereum.request({ method: 'eth_accounts' })
				handleAccountsChanged(accounts)

        let _nftsList = await myNftsList() 
        setNftsList(_nftsList)

        let allPairs = await getAllParsedPairs()
        setAllPairs(allPairs)

				window.ethereum.on('chainChanged', handleChainChanged);

			} else {
				showNot('Please install MetaMask.');
			}
		})();


	}, [])

  return (
    <div className={styles.container}>
      <button onClick={ handleConnect }>1.link to metamask wallet</button>
			<div>Balance: <strong>{ balance } ETH</strong></div>
      <button onClick={ handleReadNft } disabled={ readingNft }>
        { readingNft ? "loading ..." : "2.Read nft from the pool" }
      </button>
      { nfts.length > 0 && 
        <ul>
        {nfts.map((data) =>
          <li key={ data.key }>
            <DisplayPair data={ data }/>
          </li>
        )} 
        </ul>
      }
      <br/><br/>
      <button onClick={ handleMintTestNft } disabled={ minting }>
        { minting ? "minting ..." : "3.mint test nft to your own wallet" }
      </button><br/>
      <SimpleList 
        data={ nftsList }
        onApprove={ handleApprove }
        approvedList={ approvedList }
      />
      <br/>

      Pair:&nbsp;
      <select value={selectedPair} onChange={handleSelectedPairChange}>
        {allPairs.map(({ address }) => (
          <option value={address} key={address}>{address}</option>
        ))}
      </select>&nbsp;
      <button onClick={ handleSwap } disabled={swaping || approvedList.length === 0}>{ swaping ? "swaping..." : "5.Swap" }#{approvedList[approvedList.length - 1]}</button>
    </div>
  )
}

export default Home
