import React from 'react'
import { Image } from 'semantic-ui-react'
import UsageItem from './UsageItem'

const UsageMedium = () => (
  <UsageItem
    serviceName='medium'
    serviceTitle='Medium'
  >
    <p>
      To get access token: <br/>
      <ol>
        <li>Open Medium Settings page. ('https://medium.com/me/settings')</li>
        <li>Create a new Integration tokens.</li>
      </ol>
      <Image src='images/medium.png' />
    </p>
    <p>
      <ul>
        <li>Medium document format when creating posts is either "HTML" or "Markdown".</li>
        <li>Only creating post feature is provided in sync-sync now.</li>
      </ul>
    </p>
  </UsageItem>
)

export default UsageMedium
