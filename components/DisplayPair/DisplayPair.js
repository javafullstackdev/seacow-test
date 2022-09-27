import styles from './DisplayPair.module.css'
import JSONViewer from 'react-json-viewer';
import { useState } from 'react'

export default function DisplayPair({ data }){

  /*
  'nftId': nftId,
  'nft': decodedInput._nft,
  "nftMetadata": {
    name, tokenURI, metadata
  },
  "correspondingToken": {
    'symbol': 'ETH',
    'name': 'Ethereum',
  }
  */

  const [expandAttributes, setExpandAttributes] = useState(false)

  function handleClickExpandAttributesBtn(){
    setExpandAttributes(!expandAttributes)
  }


  return <table className={ styles.pairTable }>
      <thead>
        <tr>
          <th>Image</th>
          <th>Metadata</th>
          <th>Corresponding token</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <img 
              alt={data.nftMetadata.name} 
              src={data.nftMetadata.metadata.image}
              className={ styles.nftImage }
            />
          </td>
          <td>
            <strong>nft address:</strong> { data.nft }<br/>
            <strong>nft tokenId:</strong> { parseInt(data.nftId, 16) }<br/>
            <strong>nft tokenURI:</strong> { data.nftMetadata.tokenURI }<br/>
            <strong>nft collection name:</strong> { data.nftMetadata.name }<br/>
            <strong>nft name:</strong> { data.nftMetadata.metadata.name }<br/>
            <strong>nft description:</strong><p>{ data.nftMetadata.metadata.description }</p>
            <strong>nft img:</strong>{ data.nftMetadata.metadata.image }<br/>
            <strong>nft external url:</strong>{ data.nftMetadata.metadata.external_url }<br/>
            <strong>nft attributes:</strong><button onClick={ handleClickExpandAttributesBtn }>
              { expandAttributes ? "reduce" : "expand" }
            </button><br/>
              { expandAttributes && 
                <JSONViewer json={ data.nftMetadata.metadata.attributes }/>
              }
          </td>
          <td>
            <strong>token name:</strong>{ data.correspondingToken.name }<br/>
            <strong>token symbol:</strong>{ data.correspondingToken.symbol }
          </td>
        </tr>
      </tbody>
</table>

}

