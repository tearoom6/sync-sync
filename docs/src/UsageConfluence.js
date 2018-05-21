import React from 'react'
import { Image } from 'semantic-ui-react'
import UsageItem from './UsageItem'

const UsageConfluence = () => (
  <UsageItem
    serviceName='confluence'
    serviceTitle='Confluence'
  >
    <p>
      To get API token: <br/>
      <ol>
        <li>Open Atlassian API tokens page. ('https://id.atlassian.com/manage/api-tokens')</li>
        <li>Create an Atlassian API token.</li>
      </ol>
      <Image src='images/confluence.png' />
      <ul>
        <li>Confluence document format is "XHTML".</li>
      </ul>
    </p>
  </UsageItem>
)

export default UsageConfluence
