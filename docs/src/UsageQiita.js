import React from 'react'
import { Image } from 'semantic-ui-react'
import UsageItem from './UsageItem'

const UsageQiita = () => (
  <UsageItem
    serviceName='qiita'
    serviceTitle='Qiita'
  >
    <p>
      To get access token: <br/>
      <ol>
        <li>Open Qiita setting page. ('https://qiita.com/settings/applications')</li>
        <li>Create a personal access token.</li>
      </ol>
      <Image src='images/qiita.png' />
    </p>
    <p>
      <ul>
        <li>Qiita document format is "Markdown".</li>
        <li>At least one tag is needed to create a new post.</li>
      </ul>
    </p>
  </UsageItem>
)

export default UsageQiita
