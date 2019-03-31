import React, { Component } from 'react';
import './App.scss';
import FancyMultiSelect from "./FancyMultiSelect/FancyMultiSelect";

const possibleOptions = [
  {
    name: 'Principle',
    value: 'Principle'
  },
  {
    name: 'Sketch',
    value: 'Sketch',
  },
  {
    name: 'Photoshop',
    value: 'Photoshop',
  },
  {
    name: 'Framer',
    value: 'Framer',
  }
];

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedOptions: []
    };
  }

  handleSelectOption(optionValue){
    if (!this.state.selectedOptions.includes(optionValue)) {
      this.setState({
            selectedOptions: [
              ...this.state.selectedOptions,
              optionValue
            ]
          }
      )
    }
  }


  render() {
    return (
      <FancyMultiSelect
          possibleOptions={possibleOptions}  
          selectedOptions={this.state.selectedOptions}
          onSelectOption={this.handleSelectOption.bind(this)}/>
    );
  }
}

export default App;
