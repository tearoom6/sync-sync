import React from 'react'
import { Image } from 'semantic-ui-react'
import UsageItem from './UsageItem'

const UsageBacklog = () => (
  <UsageItem
    serviceName='backlog'
    serviceTitle='Backlog'
  >
    <p>
      To get API key: <br/>
      <ol>
        <li>Open Backlog personal settings page. ('https://[space_key].backlog.jp/EditApiSettings.action')</li>
        <li>Create a new API key.</li>
      </ol>
      <Image src='images/backlog.png' />
    </p>
    <p>
      <ul>
        <li>Backlog document format is either "Markdown" or "Backlog wiki".</li>
      </ul>
    </p>
  </UsageItem>
)

export default UsageBacklog
