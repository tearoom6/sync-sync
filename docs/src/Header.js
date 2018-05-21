import React from 'react'
import { Container, Image, Menu } from 'semantic-ui-react'

const Header = () => (
  <Menu>
    <Container>
      <Menu.Item header>
        sync-sync
      </Menu.Item>
      <Menu.Item as='a' href='https://github.com/tearoom6/sync-sync'>
        <Image
          size='mini'
          src='images/github.svg'
        />
      </Menu.Item>
      <Menu.Item as='a' href='https://atom.io/packages/sync-sync'>
        <Image
          size='mini'
          src='images/atom.png'
        />
      </Menu.Item>
    </Container>
  </Menu>
)

export default Header
