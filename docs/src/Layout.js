import React from 'react'
import { Container, Divider } from 'semantic-ui-react'
import Header from './Header'
import Introduction from './Introduction'
import Usage from './Usage'
import Footer from './Footer'

// Based on https://react.semantic-ui.com/layouts/fixed-menu
const Layout = () => (
  <div>
    <Header />

    <Container text>
      <Introduction />

      <Divider section />

      <Usage />
    </Container>

    <Footer />
  </div>
)

export default Layout
