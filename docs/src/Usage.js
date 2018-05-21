import React from 'react'
import { Container, Header } from 'semantic-ui-react'
import UsageQiita from './UsageQiita'
import UsageQiitaTeam from './UsageQiitaTeam'
import UsageEsa from './UsageEsa'
import UsageDocbase from './UsageDocbase'
import UsageWordpressCom from './UsageWordpressCom'
import UsageWordpressOrg from './UsageWordpressOrg'
import UsageConfluence from './UsageConfluence'
import UsageBacklog from './UsageBacklog'
import UsageHatena from './UsageHatena'
import UsageBlogger from './UsageBlogger'
import UsageMedium from './UsageMedium'

const Usage = () => (
  <Container id='usage'>
    <Header as='h2'>Usage</Header>
    <div className='sync-sync'>

      <UsageQiita />
      <UsageQiitaTeam />
      <UsageEsa />
      <UsageDocbase />
      <UsageWordpressCom />
      <UsageWordpressOrg />
      <UsageConfluence />
      <UsageBacklog />
      <UsageHatena />
      <UsageBlogger />
      <UsageMedium />

    </div>
  </Container>
)

export default Usage
