import React from 'react';
import './FancyMultiSelect.scss';
import { attachAnimation } from "../AnimationOrchestrator";

import { TimelineMax } from 'gsap';
import 'gsap/CSSPlugin'

import Option from './Option';
import SelectedOption from './SelectedOption';

class FancyMultiSelect extends React.Component {
    constructor(props){
        super(props);
        this.ref = React.createRef();
        
        this.props.registerAnimation(`resizeSelectedOptionsContainer`, generateResizeSelectedOptionsContainer, this.ref);
    }

    selectOption(optionValue){
        if (this.props.onSelectOption){
            this.props.onSelectOption(optionValue);
        }
    }


    render(){
        let possibleOptions = [];

        this.props.possibleOptions.forEach(optionData => {
            // only show possible option if not already selected
            let shouldShow = !this.props.selectedOptions.includes(optionData.value);

            possibleOptions.push(
                <Option key={optionData.value}
                        option={optionData}
                        onSelect={this.selectOption.bind(this)}
                        shouldShow={shouldShow}
                />
            );
        });

        let selectedOptions = this.props.selectedOptions.map(
            selectedOptionValue => <SelectedOption key={selectedOptionValue} option={selectedOptionValue} />
        );
        
        return (
            <div ref={this.ref}>
                <ul className="selection">
                    {selectedOptions}
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
        trigger: function(triggerComponent, prevProps){
                // a new selected option was added
                return triggerComponent.props.selectedOptions.length === prevProps.selectedOptions.length + 1;
                
            },
        // this function is evaluated dynamically at runtime to determine which animations should be added
        // for example, depending on which option  was selected, only the options below that one need to move up
        // returns a list of animations to add to the timeline
        animations: function(triggerComponent, prevProps){
            let props = triggerComponent.props;
            let animationsToAdd = [];

            // find which option was added
            let addedOption = props.selectedOptions.find(nextSelectedOption => !prevProps.selectedOptions.includes(nextSelectedOption));
            let addedOptionIndex = prevProps.possibleOptions.findIndex(possibleOption => possibleOption.value === addedOption);

            // reset new option to the before show animation
            animationsToAdd.push({
                animation: `selectedoption_reset_${addedOption}`,
                position: 0
            });
            
            for (let x=addedOptionIndex+1; x<props.possibleOptions.length; x++){
                let firstAnimation = x === addedOptionIndex+1;
                
                animationsToAdd.push({
                    animation: `option_moveup_${props.possibleOptions[x].value}`,
                    // all moveUp animations except the first need to start together
                    position: firstAnimation?'+=0':'withPrev'
                });
            }

            // resize the container make room for more options
            animationsToAdd.push({
                animation: `resizeSelectedOptionsContainer`,
                animationOptions: {
                    selectedOptions: props.selectedOptions
                }
            });

            // new option show animation
            animationsToAdd.push({
                animation: `selectedoption_show_${addedOption}`,
                position: '-=0.2',
            });
            
            return animationsToAdd;
        }
    }
    ])


/**** animation definitions ***/

// generates the animation for resizing the selected options container height
const generateResizeSelectedOptionsContainer= function(ref, animationOptions){
    let tl = new TimelineMax();
    let selectedOptionsContainer = ref.current.querySelector('.selection');

    // for the sake of the demo we assume each two options fit in exactly one row
    // more complicated implementation might want to check how many options
    // actually fit and how to resize accordingly
    tl.to(selectedOptionsContainer, 0.4, {
        height: 72 * (1+ Math.floor(animationOptions.selectedOptions.length/2))
    });

    return tl;
};