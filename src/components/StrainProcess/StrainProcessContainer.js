import React, { Component } from 'react';
import StrainProcess from './StrainProcess';

class StrainProcessContainer extends Component {
  static defaultProps = {};

  constructor(props) {
    super(props);

    this.state = { data: [] };
  }

  render() {
    return (
      <div>
        <StrainProcess data={this.state.data} {...this.props} />
      </div>
    );
  }
}

export default StrainProcessContainer;
