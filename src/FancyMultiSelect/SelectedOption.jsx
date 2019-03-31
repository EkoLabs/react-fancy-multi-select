import React from "react";
import { TimelineMax, Elastic} from 'gsap';
import 'gsap/CSSPlugin'

import { attachAnimation } from "@ekolabs/react-animation-orchestrator";

import "./SelectedOption.scss";

class SelectedOption extends React.Component {
    constructor(props) {
        super(props);

        this.ref = React.createRef();
        this.props.registerAnimation(`selectedoption_show_${this.props.option}`, generateShowSelectedOption, this.ref);
        this.props.registerAnimation(`selectedoption_reset_${this.props.option}`, generateResetSelectedOption, this.ref);
    }

    render() {
         return (
             <li className="item" ref={this.ref}>
                 <div className="caption">{this.props.option}</div>
                 <button className="close" />
                 <div className="frame" />
             </li>
         );
    }
}

SelectedOption.displayName = 'SelectedOption';

/**** animations definitions ***/

const generateShowSelectedOption = function(ref){
    
    let tl = new TimelineMax();
    let optionEl = ref.current;
    let [caption, close, frame] = ['.caption','.close', '.frame'].map(selector=>optionEl.querySelector(selector));

    tl
        .to(frame, 0.4, {
            scale: 1,
            opacity: 1,
            transformOrigin: 'center'
        })
        .to([caption, close], 1.1, {
            opacity: 1,
            x: 0,
            ease: Elastic.easeOut.config(1, 1)
        }, 0.6)
        .to(frame, 1.1, {
            width: '100%',
            ease: Elastic.easeOut.config(1.2, 1)
        }, 0.6);

    return tl;
};

const generateResetSelectedOption = function(ref){
    let tl = new TimelineMax();
    let optionEl = ref.current;
    let [caption, close, frame] = ['.caption','.close', '.frame'].map(selector=>optionEl.querySelector(selector));

    tl
        .set(frame, {
            width: '45px',
            scale: 0.1,
            opacity: 0,
            transformOrigin: 'center'
        })
        .set([caption, close], {
            opacity: 0,
            x: -20
        });

    return tl;
};

export default attachAnimation(SelectedOption);