import React from 'react'
import { Image } from 'semantic-ui-react'
import UsageItem from './UsageItem'

const UsageDocbase = () => (
  <UsageItem
    serviceName='docbase'
    serviceTitle='DocBase'
  >
    <p>
      To get API token: <br/>
      <ol>
        <li>Open DocBase Configuration page. ('https://[domain].docbase.io/settings/profile')</li>
        <li>Create a API token.</li>
      </ol>
      <Image src='images/docbase.png' />
    </p>
    <p>
      <ul>
        <li>DocBase document format is "Markdown".</li>
      </ul>
    </p>
  </UsageItem>
)

export default UsageDocbase
