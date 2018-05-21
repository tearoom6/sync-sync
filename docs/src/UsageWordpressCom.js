import React from 'react'
import { Image } from 'semantic-ui-react'
import UsageItem from './UsageItem'

const UsageWordpressCom = () => (
  <UsageItem
    serviceName='wordpress-com'
    serviceTitle='WordPress.com'
  >
    <p>
      To get access token: <br/>
      <ol>
        <li>Open WordPress.com Developer Resources page. ('https://developer.wordpress.com/apps/')</li>
        <li>
          Create a new application.
          <Image src='images/wordpress_com1.png' />
        </li>
        <li>
          Check client id and client secret in the application page.
          <Image src='images/wordpress_com2.png' />
        </li>
        <li>Run the PHP code below to get access token.</li>
      </ol>
    </p>
    <p>
      <pre>{`
<?php
$curl = curl_init( 'https://public-api.wordpress.com/oauth2/token' );
curl_setopt( $curl, CURLOPT_POST, true );
curl_setopt( $curl, CURLOPT_POSTFIELDS, array(
    'client_id' => '[client_id]',
    'client_secret' => '[client_secret]',
    'grant_type' => 'password',
    'username' => '[username]',
    'password' => '[password]',
) );
curl_setopt( $curl, CURLOPT_RETURNTRANSFER, 1);
$auth = curl_exec( $curl );
$auth = json_decode($auth);
$access_key = $auth->access_token;
`}
      </pre>
    </p>
    <p>
      <ul>
        <li>WordPress.com document format is basically "HTML".</li>
      </ul>
    </p>
  </UsageItem>
)

export default UsageWordpressCom
