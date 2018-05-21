import React from 'react'
import { Image } from 'semantic-ui-react'
import UsageItem from './UsageItem'

const UsageWordpressOrg = () => (
  <UsageItem
    serviceName='wordpress-org'
    serviceTitle='WordPress.org'
  >
    <p>
      To get access token: <br/>
      <ol>
        <li>Install Application Passwords plugin. ('https://wordpress.org/plugins/application-passwords/')</li>
        <li>Open user profile page of the wp-admin.</li>
        <li>
          Create a new application password.
          <Image src='images/wordpress_org.png' />
        </li>
        <li>Run the shell script below to get access token.</li>
      </ol>
    </p>
    <p>
      <pre>echo -n "[user_name]:[application_password]" | base64</pre>
    </p>
    <p>
      <ul>
        <li>WordPress.org document format is basically "HTML".</li>
      </ul>
    </p>
  </UsageItem>
)

export default UsageWordpressOrg
