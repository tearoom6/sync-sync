import React from 'react'
import { Image } from 'semantic-ui-react'
import UsageItem from './UsageItem'

const UsageHatena = () => (
  <UsageItem
    serviceName='hatena'
    serviceTitle='Hatena Blog'
  >
    <p>
    </p>
    <p>
      To get API key: <br/>
      <ol>
        <li>Open Hatena Diary admin page. ('https://blog.hatena.ne.jp/[user_id]/[blog_id]/config/detail')</li>
        <li>Check AtomPub API key.</li>
      </ol>
      <Image src='images/hatena.png' />
    </p>
    <p>
      <ul>
        <li>Hatena document format is either "Markdown" or "Hatena Notation" or "HTML" (in WYSIWYG mode).</li>
      </ul>
    </p>
  </UsageItem>
)

export default UsageHatena
