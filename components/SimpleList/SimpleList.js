
export default function SimpleList({ 
  data, onApprove, approvedList
}){
  return data && <ol>
    { data.map(({ id, name, image }) => 
      <li key={ id }>
        <strong>{ name }</strong>
        &nbsp;<button 
          onClick={ () => onApprove(id) }
          disabled={ approvedList.includes(id) }
        >4.Approve</button>
        <a href={ image }>{image}</a>
      </li>
    )}
  </ol>
}

