import React from 'react'
import { Image } from 'semantic-ui-react'
import UsageItem from './UsageItem'

const UsageEsa = () => (
  <UsageItem
    serviceName='esa'
    serviceTitle='esa.io'
  >
    <p>
      To get access token: <br/>
      <ol>
        <li>Open esa.io settings page. ('https://[team_name].esa.io/user/applications')</li>
        <li>Create a personal access token</li>
      </ol>
      <Image src='images/esa.png' />
    </p>
    <p>
      <ul>
        <li>esa.io document format is "Markdown".</li>
      </ul>
    </p>
  </UsageItem>
)

export default UsageEsa
