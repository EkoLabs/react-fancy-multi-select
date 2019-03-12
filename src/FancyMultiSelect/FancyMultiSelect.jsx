import React from 'react';
import './FancyMultiSelect.scss';
import { attachAnimation } from "../AnimationOrchestrator";

import Option from './Option';

class FancyMultiSelect extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            animatedOptions: {}
        }

    }

    selectOption(optionValue){
        this.setState({
            animatedOptions: {
                ...this.state.animatedOptions,
                [optionValue]: true
            }
        });

        if (this.props.onSelectOption){
            this.props.onSelectOption(optionValue);
        }
    }


    render(){
        let possibleOptions = [];

        this.props.possibleOptions.forEach(optionData => {

            // only show possible option if animating, or if not already selected
            if (!this.props.selectedOptions.includes(optionData.value) ||
                this.state.animatedOptions[optionData.value]
            ) {
                possibleOptions.push(
                    <Option key={optionData.value}
                            option={optionData}
                            onSelect={this.selectOption.bind(this)}
                    />
                );                 
            }
        });
        
        return (
            <div>
                <ul className="selection">

                </ul>
                <ul className="optionList">
                    {possibleOptions}
                </ul>
            </div>
        )
    }
}

export default attachAnimation(FancyMultiSelect, [
    {
        id: 'selectOption',
        trigger: function(nextProps){
                // new selection was added
                return this.props.selectedOptions.length + 1 === nextProps.selectedOptions.length;
                
            },
        animations: function(props, nextProps){
            let animationsToAdd = [];
            // find which option was added
            let addedOption = nextProps.selectedOptions.find(nextSelectedOption => !props.selectedOptions.includes(nextSelectedOption));
            let addedOptionIndex = props.possibleOptions.findIndex(possibleOption => possibleOption.value === addedOption);

            for (let x=addedOptionIndex+1; x<props.possibleOptions.length; x++){
                animationsToAdd.push({
                    animation: `option_moveup_${props.possibleOptions[x].value}`,
                    position: 'withPrev'
                });
            }
            for (let x=addedOptionIndex+1; x<props.possibleOptions.length; x++){
                animationsToAdd.push({
                    animation: `option_reset_${props.possibleOptions[x].value}`,
                });
            }
            

            // mark animation for this option as done
            if (animationsToAdd.length > 0) {
                animationsToAdd[animationsToAdd.length - 1].onComplete = function (references) {
                    references.triggerComponent.setState({
                        animatedOptions: {
                            ...references.triggerComponent.state.animatedOptions,
                            [addedOption]: false
                        }
                    });
                };
            } else {
                this.setState({
                    animatedOptions: {
                        ...this.state.animatedOptions,
                        [addedOption]: false
                    }
                });
            }
            
            return animationsToAdd;
        }
    }
    ])