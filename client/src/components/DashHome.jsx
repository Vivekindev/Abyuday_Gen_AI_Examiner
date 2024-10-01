import React from 'react'
import './DashHome.css'
import TestsCreated from './TestsCreated'
import UserCard from './UserCard'
import StatsCard1 from './StatsCard1'
import StatsCard2 from './StatsCard2'
import StatsCard3 from './StatsCard3'
import GetPremium from './GetPremium'
import SocialMedia from './SocialMedia'

const DashHome = () => {
  return (
    <>
    <div className="DashHome">

<div className="DashHomeTop">

<StatsCard1/>
<StatsCard2/>
<StatsCard3/>
<UserCard/>
</div>

<div className="DashHomeBottom">
<div className="DashHomeBottomLeft">
<TestsCreated/>
</div>
<div className="DashHomeBottomRight">
<GetPremium/>
<br></br>
<SocialMedia/>
</div>
</div>
     
    </div>
    </>
  )
}

export default DashHome


