import React from 'react'
import { Image } from 'semantic-ui-react'
import UsageItem from './UsageItem'

const UsageBlogger = () => (
  <UsageItem
    serviceName='blogger'
    serviceTitle='Blogger'
  >
    <p>
      To get API key: <br/>
      <ol>
        <li>Open Blogger developer document site. ('https://developers.google.com/blogger/docs/3.0/using')</li>
        <li>Create a new API key. ("Acquiring and using an API key")</li>
      </ol>
      <Image src='images/blogger.png' />
    </p>
    <p>
      <ul>
        <li>Blogger document format is "HTML".</li>
        <li>Only import feature is provided in sync-sync now.</li>
      </ul>
    </p>
  </UsageItem>
)

export default UsageBlogger
