import axios from 'axios';

const BASE_URL = 'https://api-rinkeby.etherscan.io/api'
const ETHERSCAN_API_KEY = 'IIUJUZDGQ8H2TUH3SASM37N8FSU2JMWWM7'

export default async function handler(req, res) {

  const { query } = req

  let r = {}

  switch(query.module){
    case 'account':
      r = await axios.get(
        BASE_URL, {
        params: {
          module: query.module,
          action: query.action,
          address: query.address,
          startblock: query.startblock,
          endblock: query.endblock,
          page: query.page,
          offset: query.offset,
          sort: query.sort,
          apikey: ETHERSCAN_API_KEY  
        }
      })
      break;
    case 'contract':
      r = await axios.get(
        BASE_URL, {
        params: {
          module: query.module,
          action: query.action,
          address: query.address,
          apikey: ETHERSCAN_API_KEY 
        }
      })
      break;
    case 'logs':
      r = await axios.get(
        BASE_URL, {
        params: {
          module: query.module,
          action: query.action,
          fromBlock: query.fromBlock,
          toBlock: query.toBlock,
          address: query.address,
          topic0: query.topic0,
          apikey: ETHERSCAN_API_KEY 
        }
      })
    default:
  }

  res.send(r.data);

}

