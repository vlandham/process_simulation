import React, { Component } from 'react';

import './App.scss';

import StrainProcessContainer from '../StrainProcess/StrainProcessContainer';

class App extends Component {
  render() {
    return (
      <div className="App">
        <StrainProcessContainer />
      </div>
    );
  }
}

export default App;
