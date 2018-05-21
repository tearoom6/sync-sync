import React from 'react'
import { Container, Header, Segment } from 'semantic-ui-react'

const Footer = () => (
  <Segment
    inverted
    vertical
  >
    <Container inverted textAlign='center'>
      <Header as='h5' inverted color='grey'>Copyright &copy; tearoom6 All right reserved</Header>
    </Container>
  </Segment>
)

export default Footer
