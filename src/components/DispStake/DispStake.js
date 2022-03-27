import React from 'react'
import { addressShortner, formatDate } from '../../utils/helpers';
import Styles from './DispStake.module.css';
import { utils } from 'ethers';

const DispStake = ({stakeItemData}) => {

  return (
    <div className={Styles.root}>
      <div className={Styles.dispCenter}>
        <div className= {Styles.content}>
            {stakeItemData.map((item) => {
              return <div  className={Styles.drag}>
                <td className= {Styles.table_data}>
                  <p className={Styles.p}>User with</p>
                {addressShortner(item.user_Addr, false)}
                </td>
                <td className= {Styles.table_data}>
                  <p className={Styles.p}>staked</p>
                {Number(utils.formatUnits(item.amount, 18)).toFixed(4)}
                </td>
                <td className= {Styles.table_data}>
                    <p className={Styles.p}>at</p>
                  {formatDate(item.time.toString())}
                </td>
                <td className= {Styles.table_data}>
                  {item.type}
                </td>
                </div>
            })}
      </div>
    </div>
    </div>
  )
}

export default DispStake