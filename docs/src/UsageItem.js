import React from 'react'

const UsageItem = (props) => (
  <section className={`${props.serviceName} service accordion`}>
    <input id={`${props.serviceName}-accordion`} type="checkbox" class="label" name={`${props.serviceName}-accordion`} />
    <label for={`${props.serviceName}-accordion`} class="label">
      <h2>{props.serviceTitle}</h2>
    </label>
    <div class="content">
      {props.children}
    </div>
  </section>
)

export default UsageItem
